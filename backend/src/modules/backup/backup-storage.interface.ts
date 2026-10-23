export const BACKUP_STORAGE_PROVIDER = Symbol('BACKUP_STORAGE_PROVIDER');

export interface StoredBackupObject {
  key: string;
  sizeBytes: number;
  lastModified: Date;
}

export interface IBackupStorageProvider {
  /**
   * Uploads an encrypted backup file and its metadata to the isolated backup storage destination.
   */
  uploadBackup(key: string, data: Buffer, metadata?: Record<string, string>): Promise<void>;

  /**
   * Downloads an encrypted backup file from the backup storage destination.
   */
  downloadBackup(key: string): Promise<Buffer>;

  /**
   * Deletes an expired backup file from the backup storage destination.
   */
  deleteBackup(key: string): Promise<void>;

  /**
   * Lists backup objects matching a given prefix.
   */
  listBackups(prefix?: string): Promise<StoredBackupObject[]>;

  /**
   * Validates storage connectivity and write/read health.
   */
  checkHealth(): Promise<boolean>;
}
