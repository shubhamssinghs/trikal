import { Injectable } from "@nestjs/common";

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

@Injectable()
export class ChunkingService {
  chunk(text: string): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    let start = 0;

    while (start < words.length) {
      const end = Math.min(start + CHUNK_SIZE, words.length);
      chunks.push(words.slice(start, end).join(" "));
      if (end >= words.length) break;
      start += CHUNK_SIZE - CHUNK_OVERLAP;
    }

    return chunks.filter((c) => c.trim().length > 20);
  }
}
