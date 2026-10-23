import { Injectable, Logger } from '@nestjs/common';
import { IBackupStorageProvider, StoredBackupObject } from '../backup-storage.interface';

@Injectable()
export class SandboxBackupStorageProvider implements IBackupStorageProvider {
  private readonly logger = new Logger(SandboxBackupStorageProvider.name);
  private readonly storage = new Map<
    string,
    { data: Buffer; metadata?: Record<string, string>; modified: Date }
  >();

  async uploadBackup(key: string, data: Buffer, metadata?: Record<string, string>): Promise<void> {
    this.storage.set(key, {
      data: Buffer.from(data),
      metadata,
      modified: new Date(),
    });
    this.logger.log(
      `[Sandbox Backup] Stored ${key} (${data.length} bytes, total objects: ${this.storage.size})`,
    );
  }

  async downloadBackup(key: string): Promise<Buffer> {
    const entry = this.storage.get(key);
    if (!entry) {
      throw new Error(`Backup object not found in sandbox storage: "${key}"`);
    }
    return Buffer.from(entry.data);
  }

  async deleteBackup(key: string): Promise<void> {
    const existed = this.storage.delete(key);
    if (existed) {
      this.logger.log(`[Sandbox Backup] Deleted ${key}`);
    }
  }

  async listBackups(prefix: string = ''): Promise<StoredBackupObject[]> {
    const results: StoredBackupObject[] = [];
    for (const [key, entry] of this.storage.entries()) {
      if (!prefix || key.startsWith(prefix)) {
        results.push({
          key,
          sizeBytes: entry.data.length,
          lastModified: entry.modified,
        });
      }
    }
    return results;
  }

  async checkHealth(): Promise<boolean> {
    return true;
  }

  getMetadata(key: string): Record<string, string> | undefined {
    return this.storage.get(key)?.metadata;
  }

  // Helper for test assertions
  clear(): void {
    this.storage.clear();
  }
}
