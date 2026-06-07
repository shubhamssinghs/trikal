import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class RisksService {
  constructor(private readonly prisma: PrismaClient) {}

  findByProject(projectId: string, organizationId: string) {
    return this.prisma.risk.findMany({
      where: { projectId, project: { organizationId } },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    });
  }

  create(projectId: string, data: { title: string; description?: string; severity?: string; mitigationPlan?: string }, organizationId: string) {
    return this.prisma.risk.create({
      data: { projectId, title: data.title, description: data.description, severity: data.severity ?? "medium", mitigationPlan: data.mitigationPlan },
    });
  }

  async update(id: string, data: { title?: string; description?: string; severity?: string; status?: string; mitigationPlan?: string }, organizationId: string) {
    const r = await this.prisma.risk.findFirst({ where: { id, project: { organizationId } } });
    if (!r) throw new NotFoundException("Risk not found");
    return this.prisma.risk.update({ where: { id }, data });
  }

  async remove(id: string, organizationId: string) {
    const r = await this.prisma.risk.findFirst({ where: { id, project: { organizationId } } });
    if (!r) throw new NotFoundException("Risk not found");
    return this.prisma.risk.delete({ where: { id } });
  }
}
