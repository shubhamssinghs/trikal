import { Injectable, ConflictException, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class LookupsService {
  constructor(private readonly prisma: PrismaClient) {}

  // ── Affiliations ────────────────────────────────────────────────────────
  affiliations() {
    return this.prisma.affiliation.findMany({
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: "asc" },
    });
  }
  createAffiliation(data: { label?: string; color?: string }) {
    if (!data.label?.trim()) throw new BadRequestException("Label is required");
    return this.prisma.affiliation.create({ data: { label: data.label.trim(), color: data.color || "#64748b" } });
  }
  async updateAffiliation(id: string, data: { label?: string; color?: string }) {
    const a = await this.prisma.affiliation.findUnique({ where: { id } });
    if (!a) throw new NotFoundException("Affiliation not found");
    return this.prisma.affiliation.update({
      where: { id },
      data: { label: data.label?.trim() || a.label, color: data.color || a.color },
    });
  }
  async deleteAffiliation(id: string) {
    const inUse = await this.prisma.member.count({ where: { affiliationId: id } });
    if (inUse > 0) throw new ConflictException(`Can't delete — ${inUse} member${inUse > 1 ? "s" : ""} use this affiliation.`);
    const a = await this.prisma.affiliation.findUnique({ where: { id } });
    if (!a) throw new NotFoundException("Affiliation not found");
    return this.prisma.affiliation.delete({ where: { id } });
  }

  // ── Roles ───────────────────────────────────────────────────────────────
  roles() {
    return this.prisma.jobRole.findMany({
      include: { _count: { select: { members: true } } },
      orderBy: { label: "asc" },
    });
  }
  createRole(data: { label?: string }) {
    if (!data.label?.trim()) throw new BadRequestException("Label is required");
    return this.prisma.jobRole.create({ data: { label: data.label.trim() } });
  }
  async updateRole(id: string, data: { label?: string }) {
    if (!data.label?.trim()) throw new BadRequestException("Label is required");
    const r = await this.prisma.jobRole.findUnique({ where: { id } });
    if (!r) throw new NotFoundException("Role not found");
    return this.prisma.jobRole.update({ where: { id }, data: { label: data.label.trim() } });
  }
  async deleteRole(id: string) {
    const inUse = await this.prisma.member.count({ where: { jobRoleId: id } });
    if (inUse > 0) throw new ConflictException(`Can't delete — ${inUse} member${inUse > 1 ? "s" : ""} use this role.`);
    const r = await this.prisma.jobRole.findUnique({ where: { id } });
    if (!r) throw new NotFoundException("Role not found");
    return this.prisma.jobRole.delete({ where: { id } });
  }

  // ── Organizations ─────────────────────────────────────────────────────────
  orgs() {
    return this.prisma.orgUnit.findMany({
      include: { _count: { select: { members: true } } },
      orderBy: { name: "asc" },
    });
  }
  createOrg(data: { name?: string }) {
    if (!data.name?.trim()) throw new BadRequestException("Name is required");
    return this.prisma.orgUnit.create({ data: { name: data.name.trim() } });
  }
  async updateOrg(id: string, data: { name?: string }) {
    if (!data.name?.trim()) throw new BadRequestException("Name is required");
    const o = await this.prisma.orgUnit.findUnique({ where: { id } });
    if (!o) throw new NotFoundException("Organization not found");
    return this.prisma.orgUnit.update({ where: { id }, data: { name: data.name.trim() } });
  }
  async deleteOrg(id: string) {
    const inUse = await this.prisma.member.count({ where: { orgUnitId: id } });
    if (inUse > 0) throw new ConflictException(`Can't delete — ${inUse} member${inUse > 1 ? "s" : ""} belong to this organization.`);
    const o = await this.prisma.orgUnit.findUnique({ where: { id } });
    if (!o) throw new NotFoundException("Organization not found");
    return this.prisma.orgUnit.delete({ where: { id } });
  }
}
