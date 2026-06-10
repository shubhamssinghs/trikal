import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaClient, DataClassification } from "@prisma/client";
import { StorageService } from "../storage/storage.service";
import { ProcessingService } from "../processing/processing.service";
import { CreateTranscriptDto } from "./dto/create-transcript.dto";

@Injectable()
export class TranscriptsService {
  private readonly logger = new Logger(TranscriptsService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly storage: StorageService,
    private readonly processing: ProcessingService,
  ) {}

  async create(dto: CreateTranscriptDto, organizationId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, organizationId },
    });
    if (!project) throw new NotFoundException("Project not found");

    const transcript = await this.prisma.meetingTranscript.create({
      data: {
        projectId: dto.projectId,
        title: dto.title,
        rawContent: dto.rawContent,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
        classification: (dto.classification as DataClassification) ?? DataClassification.INTERNAL,
      },
    });
    // Auto-process in the background: ingest → analyse → recommendations → briefing.
    void this.processing.process(transcript.id, organizationId);
    return transcript;
  }

  async createFromFile(
    data: { projectId: string; title: string; file: Express.Multer.File },
    organizationId: string,
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: data.projectId, organizationId },
    });
    if (!project) throw new NotFoundException("Project not found");

    // Extract text content from the file
    const rawContent = await this.extractText(data.file);

    // Upload file to MinIO
    const storageKey = `transcripts/${data.projectId}/${Date.now()}-${data.file.originalname}`;
    await this.storage.uploadFile(storageKey, data.file.buffer, data.file.mimetype);

    const transcript = await this.prisma.meetingTranscript.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        rawContent,
        storageKey,
        occurredAt: new Date(),
        classification: DataClassification.INTERNAL,
      },
    });
    // Auto-process in the background: ingest → analyse → recommendations → briefing.
    void this.processing.process(transcript.id, organizationId);
    return transcript;
  }

  private async extractText(file: Express.Multer.File): Promise<string> {
    return this.extractFromBuffer(file.buffer, file.originalname ?? "", file.mimetype);
  }

  /** Extract plain text from a file buffer by type (PDF/DOCX/text). */
  private async extractFromBuffer(buffer: Buffer, filename: string, mimetype?: string): Promise<string> {
    const name = filename.toLowerCase();
    const isPdf = mimetype === "application/pdf" || name.endsWith(".pdf");
    const isDocx =
      mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      name.endsWith(".docx");

    try {
      if (isPdf) {
        // pdf-parse is CommonJS; require keeps it out of the ESM type surface.
        const pdfParse = require("pdf-parse") as (b: Buffer) => Promise<{ text: string }>;
        const { text } = await pdfParse(buffer);
        return this.cleanExtracted(text) || `[No selectable text found in ${filename} — it may be a scanned image PDF.]`;
      }
      if (isDocx) {
        const mammoth = require("mammoth") as { extractRawText(o: { buffer: Buffer }): Promise<{ value: string }> };
        const { value } = await mammoth.extractRawText({ buffer });
        return this.cleanExtracted(value) || `[No text found in ${filename}.]`;
      }
    } catch (e) {
      this.logger.error(`Text extraction failed for ${filename}: ${e instanceof Error ? e.message : e}`);
      return `[Could not extract text from ${filename}. The file is stored; paste the text manually to analyse it.]`;
    }

    // Default: treat as UTF-8 text (covers text/plain and unknown types).
    return buffer.toString("utf-8");
  }

  /**
   * Re-extract a previously uploaded file from storage and re-run the pipeline.
   * Used to recover transcripts uploaded before real PDF/DOCX parsing existed
   * (their rawContent is just the placeholder note).
   */
  async reextract(id: string, organizationId: string) {
    const t = await this.prisma.meetingTranscript.findFirst({ where: { id, project: { organizationId } } });
    if (!t) throw new NotFoundException("Transcript not found");
    if (!t.storageKey) throw new NotFoundException("This transcript has no stored file to re-extract (it was pasted text).");

    const buffer = await this.storage.getObject(t.storageKey);
    if (!buffer) throw new NotFoundException("Stored file could not be retrieved.");

    const filename = t.storageKey.split("/").pop() ?? t.title;
    const rawContent = await this.extractFromBuffer(buffer, filename);

    // Replace content and clear prior knowledge so re-ingest re-chunks the real text.
    await this.prisma.knowledgeItem.deleteMany({ where: { transcriptId: id } });
    await this.prisma.meetingTranscript.update({ where: { id }, data: { rawContent, processedAt: null } });

    void this.processing.process(id, organizationId);
    return { ok: true, chars: rawContent.length };
  }

  /** Tidy extracted text: normalise newlines, collapse runaway blank lines. */
  private cleanExtracted(s: string): string {
    return (s ?? "").replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  findByProject(projectId: string, organizationId: string) {
    return this.prisma.meetingTranscript.findMany({
      where: { projectId, project: { organizationId } },
      orderBy: { occurredAt: "desc" },
      select: {
        id: true, title: true, occurredAt: true, storageKey: true,
        classification: true, processedAt: true, createdAt: true,
        source: true, metadata: true,
      },
    });
  }

  async findOne(id: string, organizationId: string) {
    const t = await this.prisma.meetingTranscript.findFirst({
      where: { id, project: { organizationId } },
      include: { knowledgeItems: { select: { id: true, title: true, sourceType: true } } },
    });
    if (!t) throw new NotFoundException("Transcript not found");
    return t;
  }

  async getDownloadUrl(id: string, organizationId: string) {
    const t = await this.findOne(id, organizationId);
    if (!t.storageKey) return { url: null };
    const url = await this.storage.getPresignedUrl(t.storageKey);
    return { url };
  }

  /** Remove a transcript from the knowledge base (cascades its knowledge items + chunks). */
  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    await this.prisma.meetingTranscript.delete({ where: { id } });
    return { ok: true };
  }
}
