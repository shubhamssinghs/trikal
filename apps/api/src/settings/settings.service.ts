import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

export interface ResolvedSettings {
  llmProvider: string;
  llmModel: string;
  anthropicApiKey: string | null;
  openaiApiKey: string | null;
  voyageApiKey: string | null;
}

const MASK = "••••••••";

function maskKey(key: string | null): string {
  if (!key) return "";
  if (key.length <= 8) return MASK;
  return `${MASK}${key.slice(-4)}`;
}

/** A write of a masked value means "leave unchanged". */
function isMasked(value: string | undefined): boolean {
  return !value || value.startsWith(MASK);
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaClient) {}

  /** Internal: full settings with real keys, for AiService/EmbeddingService. */
  async resolve(organizationId: string): Promise<ResolvedSettings> {
    const s = await this.prisma.appSettings.upsert({
      where: { organizationId },
      update: {},
      create: { organizationId },
    });
    return {
      llmProvider: s.llmProvider,
      llmModel: s.llmModel,
      anthropicApiKey: s.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY ?? null,
      openaiApiKey: s.openaiApiKey ?? process.env.OPENAI_API_KEY ?? null,
      voyageApiKey: s.voyageApiKey ?? process.env.VOYAGE_API_KEY ?? null,
    };
  }

  /** Public: settings for the dashboard with keys masked + configured flags. */
  async getForDashboard(organizationId: string) {
    const s = await this.prisma.appSettings.upsert({
      where: { organizationId },
      update: {},
      create: { organizationId },
    });
    return {
      llmProvider: s.llmProvider,
      llmModel: s.llmModel,
      anthropicApiKey: maskKey(s.anthropicApiKey),
      openaiApiKey: maskKey(s.openaiApiKey),
      voyageApiKey: maskKey(s.voyageApiKey),
      anthropicConfigured: Boolean(s.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY),
      openaiConfigured: Boolean(s.openaiApiKey ?? process.env.OPENAI_API_KEY),
      voyageConfigured: Boolean(s.voyageApiKey ?? process.env.VOYAGE_API_KEY),
    };
  }

  async update(
    organizationId: string,
    data: {
      llmProvider?: string;
      llmModel?: string;
      anthropicApiKey?: string;
      openaiApiKey?: string;
      voyageApiKey?: string;
    },
  ) {
    await this.prisma.appSettings.upsert({
      where: { organizationId },
      update: {},
      create: { organizationId },
    });

    const update: Record<string, string> = {};
    if (data.llmProvider) update.llmProvider = data.llmProvider;
    if (data.llmModel) update.llmModel = data.llmModel;
    // Only overwrite a key when a real (non-masked) value is supplied
    if (!isMasked(data.anthropicApiKey)) update.anthropicApiKey = data.anthropicApiKey!;
    if (!isMasked(data.openaiApiKey)) update.openaiApiKey = data.openaiApiKey!;
    if (!isMasked(data.voyageApiKey)) update.voyageApiKey = data.voyageApiKey!;

    await this.prisma.appSettings.update({ where: { organizationId }, data: update });
    return this.getForDashboard(organizationId);
  }
}
