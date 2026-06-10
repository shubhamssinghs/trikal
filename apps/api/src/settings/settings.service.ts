import { Injectable } from "@nestjs/common";
import { PrismaClient, Prisma } from "@prisma/client";

export interface ResolvedSettings {
  llmProvider: string;
  llmModel: string;
  anthropicApiKey: string | null;
  openaiApiKey: string | null;
  voyageApiKey: string | null;
  embeddingModel: string;
  chunkSize: number;
  chunkOverlap: number;
  retrievalTopK: number;
  temperature: number;
  maxTokens: number;
  tavilyApiKey: string | null;
  webSearchEnabled: boolean;
}

const MASK = "••••••••";

function maskKey(key: string | null): string {
  if (!key) return "";
  if (key.length <= 8) return MASK;
  return `${MASK}${key.slice(-4)}`;
}

function isMasked(value: string | undefined): boolean {
  return !value || value.startsWith(MASK);
}

const DEFAULT_APPROVALS = { createTicket: true, sendMessage: true, updateDoc: true, publishDiagram: true };
const DEFAULT_NOTIFICATIONS = { inApp: true, email: false, urgentRecs: true, approvals: true, atRisk: true };

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaClient) {}

  private ensure(organizationId: string) {
    return this.prisma.appSettings.upsert({
      where: { organizationId },
      update: {},
      create: { organizationId },
    });
  }

  /** Internal: real keys + tuning, for AI/Embedding services. */
  async resolve(organizationId: string): Promise<ResolvedSettings> {
    const s = await this.ensure(organizationId);
    return {
      llmProvider: s.llmProvider,
      llmModel: s.llmModel,
      anthropicApiKey: s.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY ?? null,
      openaiApiKey: s.openaiApiKey ?? process.env.OPENAI_API_KEY ?? null,
      voyageApiKey: s.voyageApiKey ?? process.env.VOYAGE_API_KEY ?? null,
      embeddingModel: s.embeddingModel,
      chunkSize: s.chunkSize,
      chunkOverlap: s.chunkOverlap,
      retrievalTopK: s.retrievalTopK,
      temperature: s.temperature,
      maxTokens: s.maxTokens,
      tavilyApiKey: s.tavilyApiKey ?? process.env.TAVILY_API_KEY ?? null,
      webSearchEnabled: s.webSearchEnabled,
    };
  }

  /** Public: masked keys + all settings for the dashboard. */
  async getForDashboard(organizationId: string) {
    const s = await this.ensure(organizationId);
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    return {
      orgName: org?.name ?? "",
      llmProvider: s.llmProvider,
      llmModel: s.llmModel,
      anthropicApiKey: maskKey(s.anthropicApiKey),
      openaiApiKey: maskKey(s.openaiApiKey),
      voyageApiKey: maskKey(s.voyageApiKey),
      anthropicConfigured: Boolean(s.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY),
      openaiConfigured: Boolean(s.openaiApiKey ?? process.env.OPENAI_API_KEY),
      voyageConfigured: Boolean(s.voyageApiKey ?? process.env.VOYAGE_API_KEY),
      tavilyApiKey: maskKey(s.tavilyApiKey),
      tavilyConfigured: Boolean(s.tavilyApiKey ?? process.env.TAVILY_API_KEY),
      webSearchEnabled: s.webSearchEnabled,
      embeddingModel: s.embeddingModel,
      chunkSize: s.chunkSize,
      chunkOverlap: s.chunkOverlap,
      retrievalTopK: s.retrievalTopK,
      temperature: s.temperature,
      maxTokens: s.maxTokens,
      timezone: s.timezone,
      dateFormat: s.dateFormat,
      defaultTheme: s.defaultTheme,
      approvals: (s.approvals as Record<string, boolean>) ?? DEFAULT_APPROVALS,
      notifications: (s.notifications as Record<string, boolean>) ?? DEFAULT_NOTIFICATIONS,
      oidcIssuer: process.env.OIDC_ISSUER ?? "",
      oidcClientId: process.env.OIDC_CLIENT_ID ?? "",
    };
  }

  async update(
    organizationId: string,
    data: Record<string, unknown>,
  ) {
    await this.ensure(organizationId);

    const update: Prisma.AppSettingsUpdateInput = {};

    // strings
    if (typeof data.llmProvider === "string") update.llmProvider = data.llmProvider;
    if (typeof data.llmModel === "string") update.llmModel = data.llmModel;
    if (typeof data.embeddingModel === "string") update.embeddingModel = data.embeddingModel;
    if (typeof data.timezone === "string") update.timezone = data.timezone;
    if (typeof data.dateFormat === "string") update.dateFormat = data.dateFormat;
    if (typeof data.defaultTheme === "string") update.defaultTheme = data.defaultTheme;

    // numbers
    if (typeof data.chunkSize === "number") update.chunkSize = data.chunkSize;
    if (typeof data.chunkOverlap === "number") update.chunkOverlap = data.chunkOverlap;
    if (typeof data.retrievalTopK === "number") update.retrievalTopK = data.retrievalTopK;
    if (typeof data.temperature === "number") update.temperature = data.temperature;
    if (typeof data.maxTokens === "number") update.maxTokens = data.maxTokens;

    // JSON groups
    if (data.approvals && typeof data.approvals === "object") update.approvals = data.approvals as Prisma.InputJsonValue;
    if (data.notifications && typeof data.notifications === "object") update.notifications = data.notifications as Prisma.InputJsonValue;

    // keys (only when real value supplied)
    if (!isMasked(data.anthropicApiKey as string)) update.anthropicApiKey = data.anthropicApiKey as string;
    if (!isMasked(data.openaiApiKey as string)) update.openaiApiKey = data.openaiApiKey as string;
    if (!isMasked(data.voyageApiKey as string)) update.voyageApiKey = data.voyageApiKey as string;
    if (!isMasked(data.tavilyApiKey as string)) update.tavilyApiKey = data.tavilyApiKey as string;

    // toggles
    if (typeof data.webSearchEnabled === "boolean") update.webSearchEnabled = data.webSearchEnabled;

    await this.prisma.appSettings.update({ where: { organizationId }, data: update });

    // org name lives on Organization
    if (typeof data.orgName === "string" && data.orgName.trim()) {
      await this.prisma.organization.update({ where: { id: organizationId }, data: { name: data.orgName.trim() } });
    }

    return this.getForDashboard(organizationId);
  }
}
