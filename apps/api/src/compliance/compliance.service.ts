import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

type ProfileInput = {
  name?: string;
  hipaaEnabled?: boolean;
  piaRequired?: boolean;
  phiHandling?: string;
  retentionDays?: number | null;
  auditLevel?: string;
  aiAccessPolicy?: string;
};

@Injectable()
export class ComplianceService {
  constructor(private readonly prisma: PrismaClient) {}

  findAll() {
    return this.prisma.complianceProfile.findMany({
      include: { _count: { select: { companies: true, projects: true } } },
      orderBy: { createdAt: "asc" },
    });
  }

  create(data: ProfileInput) {
    return this.prisma.complianceProfile.create({
      data: {
        name: data.name ?? "Untitled Profile",
        hipaaEnabled: data.hipaaEnabled ?? false,
        piaRequired: data.piaRequired ?? false,
        phiHandling: data.phiHandling ?? "none",
        retentionDays: data.retentionDays ?? null,
        auditLevel: data.auditLevel ?? "standard",
        aiAccessPolicy: data.aiAccessPolicy ?? "allow",
      },
    });
  }

  async update(id: string, data: ProfileInput) {
    const exists = await this.prisma.complianceProfile.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException("Compliance profile not found");
    return this.prisma.complianceProfile.update({ where: { id }, data });
  }

  async remove(id: string) {
    const profile = await this.prisma.complianceProfile.findUnique({
      where: { id },
      include: { _count: { select: { companies: true, projects: true } } },
    });
    if (!profile) throw new NotFoundException("Compliance profile not found");
    // Detach from any companies/projects first (SetNull not configured), then delete
    await this.prisma.company.updateMany({ where: { complianceProfileId: id }, data: { complianceProfileId: null } });
    await this.prisma.project.updateMany({ where: { complianceProfileId: id }, data: { complianceProfileId: null } });
    return this.prisma.complianceProfile.delete({ where: { id } });
  }
}
