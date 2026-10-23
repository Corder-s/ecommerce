export type BackupType = 'DATABASE' | 'OBJECTS' | 'FULL';
export type BackupStatus = 'SUCCESS' | 'FAILED' | 'VERIFIED' | 'CORRUPTED';

export interface BackupManifest {
  backupId: string;
  timestamp: string;
  type: BackupType;
  databaseName: string;
  originalSizeBytes: number;
  encryptedSizeBytes: number;
  sha256Checksum: string;
  encryptionAlgorithm: 'aes-256-gcm';
  iv: string; // Hex-encoded 12-byte initialization vector
  authTag: string; // Hex-encoded 16-byte authentication tag
  storageLocation: string;
  status: BackupStatus;
  verifiedAt?: string;
  retentionExpiresAt: string;
  recordCounts?: Record<string, number>;
  error?: string;
}

export interface BackupStatusSummary {
  lastBackupTimestamp: string | null;
  lastBackupStatus: BackupStatus | 'NONE';
  lastBackupSizeBytes: number;
  lastBackupChecksum: string | null;
  backupAgeHours: number;
  isRpoCompliant: boolean; // True if last backup age <= 24 hours
  retentionDays: number;
  destinationHealthy: boolean;
  totalBackupsStored: number;
  recentBackups: BackupManifest[];
}

export interface RestoreResult {
  backupId: string;
  restoredAt: string;
  durationMs: number;
  status: 'SUCCESS' | 'FAILED';
  restoredRecords: Record<string, number>;
  checksumVerified: boolean;
  error?: string;
}

export interface DatabaseDumpContent {
  metadata: {
    exportedAt: string;
    schemaVersion: string;
    platform: string;
  };
  tables: {
    users: any[];
    tenants: any[];
    tenantMemberships: any[];
    categories: any[];
    products: any[];
    orders: any[];
    orderItems: any[];
    paymentRecords: any[];
    subscriptionPlans: any[];
    subscriptions: any[];
    storedFiles: any[];
  };
}
