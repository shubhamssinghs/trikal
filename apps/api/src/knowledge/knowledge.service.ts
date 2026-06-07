import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaClient, DataClassification } from "@prisma/client";
import { ChunkingService } from "./chunking.service";
import { EmbeddingService } from "./embedding.service";

@Injectable()
export class KnowledgeService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly chunking: ChunkingService,
    private readonly embedding: EmbeddingService,
  ) {}

  async ingestTranscript(transcriptId: string, organizationId: string) {
    const transcript = await this.prisma.meetingTranscript.findFirst({
      where: { id: transcriptId, project: { organizationId } },
    });
    if (!transcript) throw new NotFoundException("Transcript not found");

    const existing = await this.prisma.knowledgeItem.findFirst({ where: { transcriptId } });
    if (existing) return { status: "already_ingested", itemId: existing.id };

    // 1. Create knowledge item
    const item = await this.prisma.knowledgeItem.create({
      data: {
        projectId: transcript.projectId,
        transcriptId: transcript.id,
        sourceType: "transcript",
        title: transcript.title,
        content: transcript.rawContent,
        classification: transcript.classification as DataClassification,
      },
    });

    // 2. Chunk the content
    const chunks = this.chunking.chunk(transcript.rawContent);

    // 3. Generate embeddings if Voyage AI is configured
    let embeddings: number[][] = [];
    if (this.embedding.isEnabled) {
      embeddings = await this.embedding.embedTexts(chunks);
    }

    // 4. Store chunks with embeddings
    for (let i = 0; i < chunks.length; i++) {
      const vec = embeddings[i];
      if (vec && vec.length > 0) {
        // Store with embedding via raw SQL (Prisma doesn't support vector literals)
        await this.prisma.$executeRaw`
          INSERT INTO "knowledge_chunks" ("id", "knowledgeItemId", "content", "chunkIndex", "embedding", "createdAt")
          VALUES (
            ${`chunk_${item.id}_${i}`},
            ${item.id},
            ${chunks[i]},
            ${i},
            ${`[${vec.join(",")}]`}::vector,
            NOW()
          )
        `;
      } else {
        await this.prisma.knowledgeChunk.create({
          data: { knowledgeItemId: item.id, content: chunks[i], chunkIndex: i },
        });
      }
    }

    await this.prisma.meetingTranscript.update({
      where: { id: transcriptId },
      data: { processedAt: new Date() },
    });

    return {
      status: "ingested",
      itemId: item.id,
      chunkCount: chunks.length,
      embeddingsGenerated: embeddings.length > 0,
    };
  }

  async searchProject(projectId: string, query: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, organizationId } });
    if (!project) throw new NotFoundException("Project not found");

    // Try vector search first
    if (this.embedding.isEnabled) {
      const queryVec = await this.embedding.embedQuery(query);
      if (queryVec) {
        const vecLiteral = `[${queryVec.join(",")}]`;
        const results = await this.prisma.$queryRaw<
          Array<{ id: string; content: string; chunk_index: number; knowledge_item_id: string; title: string; source_type: string; similarity: number }>
        >`
          SELECT
            kc.id,
            kc.content,
            kc."chunkIndex" AS chunk_index,
            ki.id AS knowledge_item_id,
            ki.title,
            ki."sourceType" AS source_type,
            1 - (kc.embedding <=> ${vecLiteral}::vector) AS similarity
          FROM "knowledge_chunks" kc
          JOIN "knowledge_items" ki ON ki.id = kc."knowledgeItemId"
          WHERE ki."projectId" = ${projectId}
            AND kc.embedding IS NOT NULL
          ORDER BY kc.embedding <=> ${vecLiteral}::vector
          LIMIT 8
        `;

        return results.map((r) => ({
          chunkId: r.id,
          content: r.content,
          similarity: Number(r.similarity).toFixed(3),
          source: { id: r.knowledge_item_id, title: r.title, sourceType: r.source_type },
        }));
      }
    }

    // Fallback: text search
    const chunks = await this.prisma.knowledgeChunk.findMany({
      where: {
        knowledgeItem: { projectId },
        content: { contains: query, mode: "insensitive" },
      },
      include: { knowledgeItem: { select: { id: true, title: true, sourceType: true } } },
      take: 8,
    });

    return chunks.map((c) => ({
      chunkId: c.id,
      content: c.content,
      similarity: null,
      source: c.knowledgeItem,
    }));
  }

  getProjectItems(projectId: string, organizationId: string) {
    return this.prisma.knowledgeItem.findMany({
      where: { projectId, project: { organizationId } },
      select: {
        id: true, title: true, sourceType: true,
        classification: true, createdAt: true,
        _count: { select: { chunks: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getRelevantChunks(projectId: string, query: string, limit = 5): Promise<string[]> {
    // With vector search: semantic similarity
    if (this.embedding.isEnabled) {
      const results = await this.searchProject(projectId, query, "org_dev");
      return results.slice(0, limit).map((r) => r.content);
    }

    // Without embeddings: extract keywords and use text search, fall back to recent chunks
    const keywords = query
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !["what", "when", "where", "which", "were", "have", "does", "about", "that", "this", "with", "from"].includes(w));

    if (keywords.length > 0) {
      // Try each keyword, collect unique chunks
      const seen = new Set<string>();
      const chunks: string[] = [];
      for (const kw of keywords.slice(0, 3)) {
        const rows = await this.prisma.knowledgeChunk.findMany({
          where: { knowledgeItem: { projectId }, content: { contains: kw, mode: "insensitive" } },
          take: 3,
        });
        for (const row of rows) {
          if (!seen.has(row.id)) { seen.add(row.id); chunks.push(row.content); }
        }
        if (chunks.length >= limit) break;
      }
      if (chunks.length > 0) return chunks.slice(0, limit);
    }

    // Final fallback: most recent chunks
    const recent = await this.prisma.knowledgeChunk.findMany({
      where: { knowledgeItem: { projectId } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return recent.map((c) => c.content);
  }
}
