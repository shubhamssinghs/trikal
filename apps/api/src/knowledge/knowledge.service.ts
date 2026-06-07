import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaClient, DataClassification } from "@prisma/client";
import { ChunkingService } from "./chunking.service";

@Injectable()
export class KnowledgeService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly chunking: ChunkingService,
  ) {}

  async ingestTranscript(transcriptId: string, organizationId: string) {
    const transcript = await this.prisma.meetingTranscript.findFirst({
      where: { id: transcriptId, project: { organizationId } },
    });
    if (!transcript) throw new NotFoundException("Transcript not found");

    const existing = await this.prisma.knowledgeItem.findFirst({
      where: { transcriptId },
    });
    if (existing) return { status: "already_ingested", itemId: existing.id };

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

    const chunks = this.chunking.chunk(transcript.rawContent);
    await this.prisma.knowledgeChunk.createMany({
      data: chunks.map((content, idx) => ({
        knowledgeItemId: item.id,
        content,
        chunkIndex: idx,
      })),
    });

    await this.prisma.meetingTranscript.update({
      where: { id: transcriptId },
      data: { processedAt: new Date() },
    });

    return { status: "ingested", itemId: item.id, chunkCount: chunks.length };
  }

  async searchProject(projectId: string, query: string, organizationId: string) {
    // Verify project access
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) throw new NotFoundException("Project not found");

    // Text search across chunks (vector search added when embeddings are configured)
    const chunks = await this.prisma.knowledgeChunk.findMany({
      where: {
        knowledgeItem: { projectId },
        content: { contains: query, mode: "insensitive" },
      },
      include: { knowledgeItem: { select: { id: true, title: true, sourceType: true } } },
      take: 10,
    });

    return chunks.map((c) => ({
      chunkId: c.id,
      content: c.content,
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
}
