import { Injectable, Logger } from "@nestjs/common";
import { VoyageAIClient } from "voyageai";
import { SettingsService } from "../settings/settings.service";

const EMBEDDING_MODEL = "voyage-3-lite"; // 512 dims
// Pack many chunks per request (Voyage allows up to 1000 inputs / ~120K tokens)
// to minimize request count — the binding constraint on free/low tiers is RPM.
const BATCH_SIZE = 128;
const INTER_BATCH_DELAY_MS = 1500; // gentle spacing to stay under per-minute limits
const DEV_ORG_ID = "org_dev";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

  private async withRetry<T>(fn: () => Promise<T>, retries = 6): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const isRateLimit = msg.includes("429") || msg.toLowerCase().includes("rate");
        if (isRateLimit && i < retries - 1) {
          const delay = Math.min(15_000 * (i + 1), 60_000); // 15s,30s,45s,60s,60s…
          this.logger.warn(`Voyage rate limit hit, retrying in ${delay / 1000}s (attempt ${i + 1}/${retries})...`);
          await sleep(delay);
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
      if (i + BATCH_SIZE < texts.length) await sleep(INTER_BATCH_DELAY_MS); // space requests
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
