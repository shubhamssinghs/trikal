import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class StakeholdersService {
  constructor(private readonly prisma: PrismaClient) {}

  findByProject(projectId: string, organizationId: string) {
    return this.prisma.stakeholder.findMany({
      where: { projectId, project: { organizationId } },
      orderBy: { name: "asc" },
    });
  }

  findByCompany(companyId: string, organizationId: string) {
    return this.prisma.stakeholder.findMany({
      where: { companyId, company: { organizationId } },
      orderBy: { name: "asc" },
    });
  }

  create(data: { name: string; email?: string; role?: string; notes?: string; affiliation?: string; organization?: string; managerId?: string | null; projectId?: string; companyId?: string }) {
    return this.prisma.stakeholder.create({ data });
  }

  async update(id: string, data: { name?: string; email?: string; role?: string; notes?: string; affiliation?: string; organization?: string; managerId?: string | null }) {
    const s = await this.prisma.stakeholder.findFirst({ where: { id } });
    if (!s) throw new NotFoundException("Stakeholder not found");
    // Prevent a stakeholder reporting to themselves
    if (data.managerId === id) data.managerId = null;
    return this.prisma.stakeholder.update({ where: { id }, data });
  }

  async remove(id: string) {
    const s = await this.prisma.stakeholder.findFirst({ where: { id } });
    if (!s) throw new NotFoundException("Stakeholder not found");
    return this.prisma.stakeholder.delete({ where: { id } });
  }
}
