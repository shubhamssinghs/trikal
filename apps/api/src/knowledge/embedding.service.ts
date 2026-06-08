import { Injectable, Logger } from "@nestjs/common";
import { VoyageAIClient } from "voyageai";
import { SettingsService } from "../settings/settings.service";

const EMBEDDING_MODEL = "voyage-3-lite"; // 512 dims
const BATCH_SIZE = 8;
const DEV_ORG_ID = "org_dev";

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(private readonly settings: SettingsService) {}

  async isEnabled(organizationId = DEV_ORG_ID): Promise<boolean> {
    const s = await this.settings.resolve(organizationId);
    return Boolean(s.voyageApiKey);
  }

  private async client(organizationId: string): Promise<VoyageAIClient | null> {
    const s = await this.settings.resolve(organizationId);
    if (!s.voyageApiKey) return null;
    return new VoyageAIClient({ apiKey: s.voyageApiKey });
  }

  private async withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (err: unknown) {
        const isRateLimit = err instanceof Error && err.message.includes("429");
        if (isRateLimit && i < retries - 1) {
          const delay = (i + 1) * 20_000;
          this.logger.warn(`Voyage rate limit hit, retrying in ${delay / 1000}s...`);
          await new Promise((r) => setTimeout(r, delay));
        } else {
          throw err;
        }
      }
    }
    throw new Error("Max retries exceeded");
  }

  async embedTexts(texts: string[], organizationId = DEV_ORG_ID): Promise<number[][]> {
    const client = await this.client(organizationId);
    if (!client) return [];

    const results: number[][] = [];
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const response = await this.withRetry(() =>
        client.embed({ input: batch, model: EMBEDDING_MODEL, inputType: "document" })
      );
      const embeddings = (response.data ?? []).map((d) => (d.embedding ?? []) as number[]);
      results.push(...embeddings);
    }
    return results;
  }

  async embedQuery(query: string, organizationId = DEV_ORG_ID): Promise<number[] | null> {
    const client = await this.client(organizationId);
    if (!client) return null;
    const response = await this.withRetry(() =>
      client.embed({ input: [query], model: EMBEDDING_MODEL, inputType: "query" })
    );
    return (response.data?.[0]?.embedding ?? []) as number[];
  }
}
