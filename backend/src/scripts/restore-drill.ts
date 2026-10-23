import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { BackupService } from '../modules/backup/backup.service';

async function runRestoreDrill() {
  console.log('================================================================');
  console.log(' GauShilp OS — Automated Disaster Recovery & Restore Drill');
  console.log('================================================================');
  console.log(`[${new Date().toISOString()}] Initializing isolated restore environment...`);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const backupService = app.get(BackupService);
    let manifests = await backupService.listAllManifests();

    if (manifests.length === 0) {
      console.log('No backup found. Creating an initial encrypted backup for the drill...');
      await backupService.createDatabaseBackup();
      manifests = await backupService.listAllManifests();
    }

    const targetBackupId = process.argv[2] || manifests[0]?.backupId;

    if (!targetBackupId) {
      throw new Error('No backup manifest available for restore drill.');
    }

    console.log(
      `[${new Date().toISOString()}] Executing restore drill for backup: ${targetBackupId}`,
    );
    const result = await backupService.restoreDatabase(targetBackupId);

    console.log('----------------------------------------------------------------');
    console.log(`RESTORE DRILL RESULT: ${result.status}`);
    console.log('----------------------------------------------------------------');
    console.log(`Backup ID:          ${result.backupId}`);
    console.log(`Restored At:        ${result.restoredAt}`);
    console.log(`Duration:           ${result.durationMs}ms`);
    console.log(`Checksum Verified:  ${result.checksumVerified}`);
    console.log('Restored & Validated Tables:');
    let totalRecords = 0;
    for (const [table, count] of Object.entries(result.restoredRecords || {})) {
      console.log(`  - ${table.padEnd(20)}: ${count} records`);
      totalRecords += count;
    }
    console.log(`Total Validated Records: ${totalRecords}`);
    console.log('================================================================');

    await app.close();

    if (result.status === 'SUCCESS' && result.checksumVerified) {
      console.log(
        '✅ ISOLATED RESTORE DRILL PASSED: Recovery verified without data loss or schema conflict.',
      );
      process.exit(0);
    } else {
      console.error('❌ RESTORE DRILL FAILED:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ RESTORE DRILL FAILED WITH EXCEPTION:', error);
    await app.close();
    process.exit(1);
  }
}

void runRestoreDrill();
