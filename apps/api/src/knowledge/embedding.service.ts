import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { VoyageAIClient } from "voyageai";

const EMBEDDING_MODEL = "voyage-3-lite"; // 1024 dims, Anthropic-recommended
const BATCH_SIZE = 8;

@Injectable()
export class EmbeddingService {
  private readonly client: VoyageAIClient | null = null;
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>("VOYAGE_API_KEY");
    if (apiKey) {
      this.client = new VoyageAIClient({ apiKey });
      this.logger.log("Voyage AI embeddings enabled");
    } else {
      this.logger.warn("VOYAGE_API_KEY not set — vector search disabled, falling back to text search");
    }
  }

  get isEnabled() {
    return this.client !== null;
  }

  private async withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (err: unknown) {
        const isRateLimit = err instanceof Error && err.message.includes("429");
        if (isRateLimit && i < retries - 1) {
          const delay = (i + 1) * 20_000; // 20s, 40s
          this.logger.warn(`Voyage rate limit hit, retrying in ${delay / 1000}s...`);
          await new Promise((r) => setTimeout(r, delay));
        } else {
          throw err;
        }
      }
    }
    throw new Error("Max retries exceeded");
  }

  async embedTexts(texts: string[]): Promise<number[][]> {
    if (!this.client) return [];

    const results: number[][] = [];
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const response = await this.withRetry(() =>
        this.client!.embed({ input: batch, model: EMBEDDING_MODEL, inputType: "document" })
      );
      const embeddings = (response.data ?? []).map((d) => (d.embedding ?? []) as number[]);
      results.push(...embeddings);
    }
    return results;
  }

  async embedQuery(query: string): Promise<number[] | null> {
    if (!this.client) return null;
    const response = await this.withRetry(() =>
      this.client!.embed({ input: [query], model: EMBEDDING_MODEL, inputType: "query" })
    );
    return (response.data?.[0]?.embedding ?? []) as number[];
  }
}
