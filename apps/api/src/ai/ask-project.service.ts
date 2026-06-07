import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AiService } from "./ai.service";
import { KnowledgeService } from "../knowledge/knowledge.service";

const SYSTEM_PROMPT = `You are an intelligent project assistant with access to meeting transcripts and project notes.
Answer the user's question using ONLY the provided context. Be concise and direct.
If the context does not contain enough information to answer, say so clearly.
Always cite which meeting/source your answer comes from when relevant.`;

@Injectable()
export class AskProjectService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly ai: AiService,
    private readonly knowledge: KnowledgeService,
  ) {}

  async ask(projectId: string, question: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true, name: true, description: true },
    });
    if (!project) throw new NotFoundException("Project not found");

    // Retrieve relevant chunks via vector search (or text fallback)
    const chunks = await this.knowledge.getRelevantChunks(projectId, question, 5);

    if (chunks.length === 0) {
      return {
        answer: "No relevant information found in the project knowledge base. Upload and analyse some transcripts first.",
        sources: 0,
        usedVectorSearch: false,
      };
    }

    const context = chunks
      .map((c, i) => `[Source ${i + 1}]\n${c}`)
      .join("\n\n---\n\n");

    const userPrompt = `Project: ${project.name}\n\nContext from project knowledge base:\n${context}\n\nQuestion: ${question}`;

    const answer = await this.ai.complete(SYSTEM_PROMPT, userPrompt, 1024);

    return {
      answer,
      sources: chunks.length,
      usedVectorSearch: this.knowledge["embedding"]?.isEnabled ?? false,
    };
  }
}
