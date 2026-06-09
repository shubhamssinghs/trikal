import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";
import { KnowledgeService } from "../knowledge/knowledge.service";

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly knowledge: KnowledgeService,
  ) {}

  list(projectId: string, organizationId: string) {
    return this.prisma.projectDocument.findMany({
      where: { projectId, organizationId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, status: true, version: true, updatedAt: true, approvedAt: true, knowledgeItemId: true },
    });
  }

  async get(id: string, organizationId: string) {
    const doc = await this.prisma.projectDocument.findFirst({ where: { id, organizationId } });
    if (!doc) throw new NotFoundException("Document not found");
    return doc;
  }

  /** Approve a draft → ingest into the knowledge base so the agent can use it. */
  async approve(id: string, organizationId: string) {
    const doc = await this.get(id, organizationId);
    if (doc.status === "approved" && doc.knowledgeItemId) return doc;
    const { itemId } = await this.knowledge.ingestContent({
      projectId: doc.projectId,
      title: doc.title,
      content: doc.content,
      sourceType: "document",
      organizationId,
    });
    return this.prisma.projectDocument.update({
      where: { id },
      data: { status: "approved", approvedAt: new Date(), knowledgeItemId: itemId },
    });
  }

  async remove(id: string, organizationId: string) {
    await this.get(id, organizationId);
    return this.prisma.projectDocument.delete({ where: { id } });
  }

  /** Render the document's markdown to a .docx buffer. */
  async exportDocx(id: string, organizationId: string): Promise<{ filename: string; buffer: Buffer }> {
    const doc = await this.get(id, organizationId);
    const paragraphs = markdownToParagraphs(doc.content);
    const file = new Document({ sections: [{ children: [new Paragraph({ text: doc.title, heading: HeadingLevel.TITLE }), ...paragraphs] }] });
    const buffer = await Packer.toBuffer(file);
    const filename = `${doc.title.replace(/[^\w.-]+/g, "_").slice(0, 60) || "document"}.docx`;
    return { filename, buffer };
  }
}

/** Minimal markdown → docx paragraphs (headings, bullets, bold, paragraphs). */
function markdownToParagraphs(md: string): Paragraph[] {
  const out: Paragraph[] = [];
  for (const raw of md.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) { out.push(new Paragraph({ text: "" })); continue; }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4][h[1].length - 1];
      out.push(new Paragraph({ heading: level, children: inlineRuns(h[2]) }));
      continue;
    }
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      const indent = Math.floor((raw.length - raw.trimStart().length) / 2);
      out.push(new Paragraph({ bullet: { level: Math.min(indent, 3) }, children: inlineRuns(bullet[1]) }));
      continue;
    }
    // Numbered list items render as plain paragraphs (keep their "1." prefix).
    out.push(new Paragraph({ children: inlineRuns(line) }));
  }
  return out;
}

/** Split on **bold** markers into TextRuns. */
function inlineRuns(text: string): TextRun[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((p) => {
    const m = /^\*\*([^*]+)\*\*$/.exec(p);
    return m ? new TextRun({ text: m[1], bold: true }) : new TextRun(p);
  });
}
