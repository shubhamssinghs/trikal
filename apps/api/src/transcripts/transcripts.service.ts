import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaClient, DataClassification } from "@prisma/client";
import { CreateTranscriptDto } from "./dto/create-transcript.dto";

@Injectable()
export class TranscriptsService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(dto: CreateTranscriptDto, organizationId: string) {
    // Verify project belongs to org
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

  findByProject(projectId: string, organizationId: string) {
    return this.prisma.meetingTranscript.findMany({
      where: { projectId, project: { organizationId } },
      orderBy: { occurredAt: "desc" },
      select: {
        id: true, title: true, occurredAt: true,
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
}
