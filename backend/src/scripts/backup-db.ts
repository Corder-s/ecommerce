import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { BackupService } from '../modules/backup/backup.service';

async function runBackup() {
  console.log('================================================================');
  console.log(' GauShilp OS — Automated Daily PostgreSQL Database Backup');
  console.log('================================================================');
  console.log(`[${new Date().toISOString()}] Initializing backup execution context...`);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const backupService = app.get(BackupService);

    console.log(
      `[${new Date().toISOString()}] Starting database export and envelope encryption...`,
    );
    const manifest = await backupService.createDatabaseBackup();

    console.log('----------------------------------------------------------------');
    console.log('✅ BACKUP COMPLETED & VERIFIED SUCCESSFULLY');
    console.log('----------------------------------------------------------------');
    console.log(`Backup ID:             ${manifest.backupId}`);
    console.log(`Timestamp:             ${manifest.timestamp}`);
    console.log(`Database:              ${manifest.databaseName}`);
    console.log(`Status:                ${manifest.status}`);
    console.log(`Original Plain Size:   ${manifest.originalSizeBytes} bytes`);
    console.log(`Encrypted Size:        ${manifest.encryptedSizeBytes} bytes`);
    console.log(`Encryption Algorithm:  ${manifest.encryptionAlgorithm}`);
    console.log(`SHA-256 Checksum:      ${manifest.sha256Checksum}`);
    console.log(`Storage Location:      ${manifest.storageLocation}`);
    console.log(`Retention Expiry:      ${manifest.retentionExpiresAt}`);
    console.log('Record Counts:');
    for (const [table, count] of Object.entries(manifest.recordCounts || {})) {
      console.log(`  - ${table.padEnd(20)}: ${count}`);
    }
    console.log('================================================================');

    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ BACKUP EXECUTION FAILED:', error);
    await app.close();
    process.exit(1);
  }
}

void runBackup();
