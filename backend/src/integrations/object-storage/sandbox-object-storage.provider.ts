import { Injectable, Logger } from '@nestjs/common';
import { IObjectStorageProvider, HeadObjectResult } from './interfaces/object-storage.interface';

@Injectable()
export class SandboxObjectStorageProvider implements IObjectStorageProvider {
  private readonly logger = new Logger(SandboxObjectStorageProvider.name);
  private readonly storage = new Map<
    string,
    { buffer: Buffer; contentType: string; metadata?: Record<string, string> }
  >();
  private readonly publicAssetsBaseUrl: string;

  constructor(publicAssetsBaseUrl = 'https://media.gaushilp.example.com') {
    this.publicAssetsBaseUrl = publicAssetsBaseUrl.replace(/\/+$/, '');
    this.logger.warn(
      'SandboxObjectStorageProvider initialized (Test/Sandbox Mode). Live Cloudflare R2 operations are NOT active.',
    );
  }

  /**
   * Test helper to simulate a client directly uploading a file via presigned URL.
   */
  simulateUpload(
    key: string,
    buffer: Buffer,
    contentType = 'image/jpeg',
    metadata?: Record<string, string>,
  ): void {
    this.storage.set(key, { buffer, contentType, metadata });
    this.logger.debug(
      `[SandboxStorage] Simulated direct upload for key: ${key} (${buffer.length} bytes)`,
    );
  }

  /**
   * Test helper to inspect all objects stored in sandbox.
   */
  getAllKeys(): string[] {
    return Array.from(this.storage.keys());
  }

  /**
   * Test helper to clear sandbox storage.
   */
  clear(): void {
    this.storage.clear();
  }

  async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds: number,
  ): Promise<string> {
    const encodedKey = encodeURIComponent(key);
    return `https://sandbox-r2.gaushilp.local/upload?key=${encodedKey}&contentType=${encodeURIComponent(contentType)}&expiresIn=${expiresInSeconds}`;
  }

  async getPresignedDownloadUrl(key: string, expiresInSeconds: number): Promise<string> {
    const encodedKey = encodeURIComponent(key);
    return `https://sandbox-r2.gaushilp.local/download?key=${encodedKey}&expiresIn=${expiresInSeconds}`;
  }

  async headObject(key: string): Promise<HeadObjectResult> {
    const item = this.storage.get(key);
    if (!item) {
      return { exists: false };
    }

    return {
      exists: true,
      contentLength: item.buffer.length,
      contentType: item.contentType,
      checksum: 'sandbox-md5-checksum',
      metadata: item.metadata,
    };
  }

  async getObjectBuffer(key: string): Promise<Buffer> {
    const item = this.storage.get(key);
    if (!item) {
      throw new Error(`Object not found in sandbox storage for key: ${key}`);
    }
    return item.buffer;
  }

  async deleteObject(key: string): Promise<void> {
    this.storage.delete(key);
    this.logger.debug(`[SandboxStorage] Deleted key: ${key}`);
  }

  getPublicUrl(key: string): string {
    const cleanKey = key.replace(/^\/+/, '');
    return `${this.publicAssetsBaseUrl}/${cleanKey}`;
  }

  isLiveVerified(): boolean {
    return false;
  }
}
