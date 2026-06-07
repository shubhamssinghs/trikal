import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class MilestonesService {
  constructor(private readonly prisma: PrismaClient) {}

  findByProject(projectId: string, organizationId: string) {
    return this.prisma.milestone.findMany({
      where: { projectId, project: { organizationId } },
      orderBy: { dueDate: "asc" },
    });
  }

  create(projectId: string, data: { name: string; description?: string; dueDate?: string }, organizationId: string) {
    return this.prisma.milestone.create({
      data: {
        projectId,
        name: data.name,
        description: data.description,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
    });
  }

  async update(id: string, data: { name?: string; description?: string; dueDate?: string; status?: string }, organizationId: string) {
    const m = await this.prisma.milestone.findFirst({ where: { id, project: { organizationId } } });
    if (!m) throw new NotFoundException("Milestone not found");
    return this.prisma.milestone.update({
      where: { id },
      data: { ...data, dueDate: data.dueDate ? new Date(data.dueDate) : undefined },
    });
  }

  async remove(id: string, organizationId: string) {
    const m = await this.prisma.milestone.findFirst({ where: { id, project: { organizationId } } });
    if (!m) throw new NotFoundException("Milestone not found");
    return this.prisma.milestone.delete({ where: { id } });
  }
}
