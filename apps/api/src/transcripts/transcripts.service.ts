import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaClient, DataClassification } from "@prisma/client";
import { StorageService } from "../storage/storage.service";
import { CreateTranscriptDto } from "./dto/create-transcript.dto";

@Injectable()
export class TranscriptsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly storage: StorageService,
  ) {}

  async create(dto: CreateTranscriptDto, organizationId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, organizationId },
    });
    if (!project) throw new NotFoundException("Project not found");

    return this.prisma.meetingTranscript.create({
      data: {
        projectId: dto.projectId,
        title: dto.title,
        rawContent: dto.rawContent,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
        classification: (dto.classification as DataClassification) ?? DataClassification.INTERNAL,
      },
    });
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
    const rawContent = this.extractText(data.file);

    // Upload file to MinIO
    const storageKey = `transcripts/${data.projectId}/${Date.now()}-${data.file.originalname}`;
    await this.storage.uploadFile(storageKey, data.file.buffer, data.file.mimetype);

    return this.prisma.meetingTranscript.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        rawContent,
        storageKey,
        occurredAt: new Date(),
        classification: DataClassification.INTERNAL,
      },
    });
  }

  private extractText(file: Express.Multer.File): string {
    // For TXT files, decode buffer directly
    if (file.mimetype === "text/plain") {
      return file.buffer.toString("utf-8");
    }
    // For PDF/DOCX: store filename note, actual parsing can be added later
    // In production, use pdf-parse or mammoth for extraction
    return `[File uploaded: ${file.originalname}]\n\nNote: Full text extraction for PDF/DOCX requires additional processing. The file has been stored in MinIO. Paste the transcript text manually or use the text upload option for AI analysis.`;
  }

  findByProject(projectId: string, organizationId: string) {
    return this.prisma.meetingTranscript.findMany({
      where: { projectId, project: { organizationId } },
      orderBy: { occurredAt: "desc" },
      select: {
        id: true, title: true, occurredAt: true, storageKey: true,
        classification: true, processedAt: true, createdAt: true,
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
}
