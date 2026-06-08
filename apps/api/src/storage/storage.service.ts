import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client } from "minio";

const BUCKET = "trikal";

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly client: Client;
  private readonly logger = new Logger(StorageService.name);
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get("MINIO_ENDPOINT", "localhost");
    const port = Number(this.config.get("MINIO_PORT", "9000"));
    const accessKey = this.config.get("MINIO_ROOT_USER", "trikal");
    const secretKey = this.config.get("MINIO_ROOT_PASSWORD", "");

    this.enabled = Boolean(secretKey);
    this.client = new Client({
      endPoint: endpoint,
      port,
      useSSL: false,
      accessKey,
      secretKey,
    });
  }

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.warn("MinIO not configured — file storage disabled");
      return;
    }
    try {
      const exists = await this.client.bucketExists(BUCKET);
      if (!exists) {
        await this.client.makeBucket(BUCKET);
        this.logger.log(`Created MinIO bucket: ${BUCKET}`);
      } else {
        this.logger.log("MinIO connected");
      }
    } catch (err) {
      this.logger.error("MinIO connection failed", err);
    }
  }

  async uploadFile(key: string, buffer: Buffer, contentType: string): Promise<string> {
    if (!this.enabled) return "";
    await this.client.putObject(BUCKET, key, buffer, buffer.length, { "Content-Type": contentType });
    return key;
  }

  async getPresignedUrl(key: string, expirySeconds = 3600): Promise<string> {
    if (!this.enabled || !key) return "";
    return this.client.presignedGetObject(BUCKET, key, expirySeconds);
  }

  /** Fetch an object's bytes (for serving through the API). */
  async getObject(key: string): Promise<Buffer | null> {
    if (!this.enabled || !key) return null;
    try {
      const stream = await this.client.getObject(BUCKET, key);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(chunk as Buffer);
      return Buffer.concat(chunks);
    } catch {
      return null;
    }
  }

  async deleteFile(key: string): Promise<void> {
    if (!this.enabled || !key) return;
    await this.client.removeObject(BUCKET, key);
  }
}
