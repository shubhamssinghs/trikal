import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaClient, Prisma } from "@prisma/client";
import { AiService } from "../ai/ai.service";

type SkillBody = {
  slug?: string; name?: string; description?: string; instructions?: string;
  kind?: string; handlerKey?: string; inputSchema?: unknown; composes?: string[];
  externalAction?: boolean; enabled?: boolean; model?: string;
};

const DRAFT_SYSTEM = `You design reusable "skills" (tools) for an AI technical-project-manager assistant. Given a short request and the list of skills that already exist, research the intent and propose ONE well-formed skill.

Output ONLY valid JSON with this exact shape:
{
  "name": "short human name",
  "slug": "snake_case_tool_name",
  "description": "one or two sentences telling the agent WHEN to call this skill",
  "instructions": "guidance on HOW the skill should behave when invoked",
  "kind": "prompt" | "composite",
  "composes": ["existing_skill_slug", ...]
}

Rules:
- "kind" = "composite" if it orchestrates existing skills, else "prompt".
- "composes" may ONLY contain slugs from the provided existing-skills list (use [] if none apply).
- Be specific and grounded in the request. Make the description a clear trigger ("Call this when…").`;

@Injectable()
export class SkillsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly ai: AiService,
  ) {}

  /** AI-propose a complete skill from a plain-language description (not saved). */
  async draft(organizationId: string, description: string) {
    if (!description?.trim()) throw new BadRequestException("Describe the skill you want.");
    const existing = await this.prisma.skill.findMany({
      where: { OR: [{ organizationId: null }, { organizationId }] },
      select: { slug: true, name: true, description: true },
    });
    const list = existing.map((s) => `- ${s.slug}: ${s.name} — ${s.description}`).join("\n") || "(none yet)";
    const raw = await this.ai.complete(DRAFT_SYSTEM, `Existing skills:\n${list}\n\nRequest: ${description}`, 1024, organizationId);

    const knownSlugs = new Set(existing.map((s) => s.slug));
    try {
      const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      const p = JSON.parse(cleaned) as Record<string, unknown>;
      const name = String(p.name ?? "").trim();
      const slug = String(p.slug ?? name).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      return {
        name,
        slug,
        description: String(p.description ?? ""),
        instructions: typeof p.instructions === "string" ? p.instructions : "",
        kind: p.kind === "composite" ? "composite" : "prompt",
        composes: Array.isArray(p.composes) ? (p.composes as unknown[]).map(String).filter((s) => knownSlugs.has(s)) : [],
      };
    } catch {
      // Model returned prose (e.g. a provider/billing notice) — surface it.
      throw new BadRequestException(raw.startsWith("[") || raw.includes("API") ? raw.slice(0, 200) : "Could not draft a skill from that description. Try rephrasing.");
    }
  }

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
