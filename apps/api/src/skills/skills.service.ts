import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaClient, Prisma } from "@prisma/client";

type SkillBody = {
  slug?: string; name?: string; description?: string; instructions?: string;
  kind?: string; handlerKey?: string; inputSchema?: unknown; composes?: string[];
  externalAction?: boolean; enabled?: boolean; model?: string;
};

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaClient) {}

  list(organizationId: string) {
    return this.prisma.skill.findMany({
      where: { OR: [{ organizationId: null }, { organizationId }] },
      orderBy: [{ builtin: "desc" }, { name: "asc" }],
    });
  }

  async create(organizationId: string, body: SkillBody) {
    const slug = (body.slug ?? "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (!slug) throw new BadRequestException("A slug is required");
    if (!body.name?.trim()) throw new BadRequestException("A name is required");
    const exists = await this.prisma.skill.findUnique({ where: { slug } });
    if (exists) throw new BadRequestException(`Slug "${slug}" is already taken`);
    return this.prisma.skill.create({
      data: {
        organizationId, slug, name: body.name.trim(),
        description: body.description ?? "",
        instructions: body.instructions ?? null,
        kind: body.kind ?? "composite",
        handlerKey: body.handlerKey ?? null,
        composes: body.composes ?? [],
        externalAction: !!body.externalAction,
        enabled: body.enabled ?? false,
        model: body.model ?? null,
        inputSchema: (body.inputSchema && typeof body.inputSchema === "object"
          ? body.inputSchema
          : { type: "object", properties: {}, additionalProperties: false }) as Prisma.InputJsonValue,
      },
    });
  }

  async update(id: string, organizationId: string, body: SkillBody) {
    const skill = await this.prisma.skill.findUnique({ where: { id } });
    if (!skill) throw new NotFoundException("Skill not found");
    // Built-ins: only the enabled flag and instructions are editable.
    const data: Prisma.SkillUpdateInput = skill.builtin
      ? { enabled: body.enabled ?? skill.enabled, instructions: body.instructions ?? skill.instructions }
      : {
          name: body.name ?? undefined,
          description: body.description ?? undefined,
          instructions: body.instructions ?? undefined,
          kind: body.kind ?? undefined,
          composes: body.composes ?? undefined,
          externalAction: body.externalAction ?? undefined,
          enabled: body.enabled ?? undefined,
          model: body.model ?? undefined,
          inputSchema: body.inputSchema && typeof body.inputSchema === "object" ? (body.inputSchema as Prisma.InputJsonValue) : undefined,
        };
    return this.prisma.skill.update({ where: { id }, data });
  }

  async remove(id: string) {
    const skill = await this.prisma.skill.findUnique({ where: { id } });
    if (!skill) throw new NotFoundException("Skill not found");
    if (skill.builtin) throw new ForbiddenException("Built-in skills can't be deleted — disable it instead.");
    return this.prisma.skill.delete({ where: { id } });
  }
}
