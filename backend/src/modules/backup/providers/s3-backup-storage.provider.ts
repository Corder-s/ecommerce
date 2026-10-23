import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { IBackupStorageProvider, StoredBackupObject } from '../backup-storage.interface';
import { Readable } from 'stream';

@Injectable()
export class S3BackupStorageProvider implements IBackupStorageProvider {
  private readonly logger = new Logger(S3BackupStorageProvider.name);
  private readonly s3Client: S3Client | null = null;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('backup.bucket') || 'gaushilp-backups-dr';
    const endpoint = this.configService.get<string>('backup.endpoint');
    const region = this.configService.get<string>('backup.region') || 'auto';
    const accessKeyId = this.configService.get<string>('backup.accessKeyId');
    const secretAccessKey = this.configService.get<string>('backup.secretAccessKey');

    if (accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region,
        endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        forcePathStyle: true,
      });
      this.logger.log(
        `Initialized S3/R2 Backup Storage client for bucket: "${this.bucket}" (endpoint: ${endpoint || 'AWS Default'})`,
      );
    } else {
      this.logger.warn(
        'S3/R2 Backup Storage credentials not provided. Set BACKUP_STORAGE_ACCESS_KEY_ID & BACKUP_STORAGE_SECRET_ACCESS_KEY.',
      );
    }
  }

  async uploadBackup(key: string, data: Buffer, metadata?: Record<string, string>): Promise<void> {
    if (!this.s3Client) {
      throw new Error('S3/R2 Backup Storage client is unconfigured. Cannot upload backup.');
    }

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        Metadata: metadata,
        ServerSideEncryption: 'AES256', // Provider-managed at-rest encryption in addition to client envelope encryption
      }),
    );

    this.logger.log(`Uploaded backup object to s3://${this.bucket}/${key}`);
  }

  async downloadBackup(key: string): Promise<Buffer> {
    if (!this.s3Client) {
      throw new Error('S3/R2 Backup Storage client is unconfigured. Cannot download backup.');
    }

    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );

    if (!response.Body) {
      throw new Error(`Empty response body for backup key: ${key}`);
    }

    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  async deleteBackup(key: string): Promise<void> {
    if (!this.s3Client) {
      return;
    }

    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );

    this.logger.log(`Deleted backup object from s3://${this.bucket}/${key}`);
  }

  async listBackups(prefix: string = ''): Promise<StoredBackupObject[]> {
    if (!this.s3Client) {
      return [];
    }

    const response = await this.s3Client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      }),
    );

    return (
      response.Contents?.map((item) => ({
        key: item.Key || '',
        sizeBytes: item.Size || 0,
        lastModified: item.LastModified || new Date(),
      })) || []
    );
  }

  async checkHealth(): Promise<boolean> {
    if (!this.s3Client) {
      return false;
    }

    try {
      await this.s3Client.send(
        new HeadBucketCommand({
          Bucket: this.bucket,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }
}
