import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaClient, Prisma } from "@prisma/client";

const INCLUDE = {
  affiliation: true,
  jobRole: true,
  orgUnit: true,
} satisfies Prisma.StakeholderInclude;

type Row = Prisma.StakeholderGetPayload<{ include: typeof INCLUDE }>;

// Flatten the FK relations into the shape the frontend uses (resolved labels +
// ids for editing + affiliation color for the badge).
function shape(s: Row) {
  return {
    id: s.id,
    name: s.name,
    email: s.email ?? undefined,
    managerId: s.managerId ?? null,
    affiliationId: s.affiliationId ?? null,
    jobRoleId: s.jobRoleId ?? null,
    orgUnitId: s.orgUnitId ?? null,
    affiliation: s.affiliation?.label ?? undefined,
    affiliationColor: s.affiliation?.color ?? undefined,
    role: s.jobRole?.label ?? undefined,
    organization: s.orgUnit?.name ?? undefined,
  };
}

type Input = {
  name?: string; email?: string; managerId?: string | null;
  affiliationId?: string | null; jobRoleId?: string | null; orgUnitId?: string | null;
  projectId?: string; companyId?: string;
};

@Injectable()
export class StakeholdersService {
  constructor(private readonly prisma: PrismaClient) {}

  async findByProject(projectId: string, organizationId: string) {
    const rows = await this.prisma.stakeholder.findMany({
      where: { projectId, project: { organizationId } },
      include: INCLUDE,
      orderBy: { name: "asc" },
    });
    return rows.map(shape);
  }

  async findByCompany(companyId: string, organizationId: string) {
    const rows = await this.prisma.stakeholder.findMany({
      where: { companyId, company: { organizationId } },
      include: INCLUDE,
      orderBy: { name: "asc" },
    });
    return rows.map(shape);
  }

  async create(data: Input) {
    const row = await this.prisma.stakeholder.create({
      data: {
        name: data.name ?? "Unnamed",
        email: data.email,
        managerId: data.managerId ?? undefined,
        affiliationId: data.affiliationId ?? undefined,
        jobRoleId: data.jobRoleId ?? undefined,
        orgUnitId: data.orgUnitId ?? undefined,
        projectId: data.projectId,
        companyId: data.companyId,
      },
      include: INCLUDE,
    });
    return shape(row);
  }

  async update(id: string, data: Input) {
    const s = await this.prisma.stakeholder.findFirst({ where: { id } });
    if (!s) throw new NotFoundException("Stakeholder not found");
    if (data.managerId === id) data.managerId = null;
    const row = await this.prisma.stakeholder.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        managerId: data.managerId,
        affiliationId: data.affiliationId,
        jobRoleId: data.jobRoleId,
        orgUnitId: data.orgUnitId,
      },
      include: INCLUDE,
    });
    return shape(row);
  }

  async remove(id: string) {
    const s = await this.prisma.stakeholder.findFirst({ where: { id } });
    if (!s) throw new NotFoundException("Stakeholder not found");
    return this.prisma.stakeholder.delete({ where: { id } });
  }
}
