import { Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BackupService } from './backup.service';
import { AdminBackupController } from './admin-backup.controller';
import { BACKUP_STORAGE_PROVIDER } from './backup-storage.interface';
import { SandboxBackupStorageProvider } from './providers/sandbox-backup-storage.provider';
import { S3BackupStorageProvider } from './providers/s3-backup-storage.provider';

const backupStorageProvider: Provider = {
  provide: BACKUP_STORAGE_PROVIDER,
  useFactory: (configService: ConfigService) => {
    const providerType = configService.get<string>('backup.storageProvider') || 'sandbox';

    if (providerType === 's3') {
      return new S3BackupStorageProvider(configService);
    }

    return new SandboxBackupStorageProvider();
  },
  inject: [ConfigService],
};

@Module({
  controllers: [AdminBackupController],
  providers: [backupStorageProvider, BackupService],
  exports: [BackupService, BACKUP_STORAGE_PROVIDER],
})
export class BackupModule {}
