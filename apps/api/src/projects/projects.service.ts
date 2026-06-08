import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaClient, ProjectStatus } from "@prisma/client";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaClient) {}

  findAll(organizationId: string, companyId?: string) {
    return this.prisma.project.findMany({
      where: { organizationId, ...(companyId ? { companyId } : {}) },
      include: {
        company: { select: { id: true, name: true } },
        _count: { select: { knowledgeItems: true, recommendations: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, organizationId },
      include: {
        company: true,
        program: true,
        workstreams: true,
        milestones: { orderBy: { dueDate: "asc" } },
        risks: { where: { status: "open" } },
        members: true,
        complianceProfile: true,
        _count: {
          select: { knowledgeItems: true, recommendations: true, diagrams: true },
        },
      },
    });
    if (!project) throw new NotFoundException("Project not found");
    return project;
  }

  create(dto: CreateProjectDto, organizationId: string) {
    const { startDate, targetEndDate, ...rest } = dto;
    return this.prisma.project.create({
      data: {
        ...rest,
        organizationId,
        startDate: startDate ? new Date(startDate) : undefined,
        targetEndDate: targetEndDate ? new Date(targetEndDate) : undefined,
      },
    });
  }

  async update(id: string, dto: UpdateProjectDto, organizationId: string) {
    await this.findOne(id, organizationId);
    const { startDate, targetEndDate, ...rest } = dto;
    return this.prisma.project.update({
      where: { id },
      data: {
        ...rest,
        startDate: startDate ? new Date(startDate) : undefined,
        targetEndDate: targetEndDate ? new Date(targetEndDate) : undefined,
      },
    });
  }

  async updateStatus(id: string, status: ProjectStatus, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.project.update({ where: { id }, data: { status } });
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.project.delete({ where: { id } });
  }
}
