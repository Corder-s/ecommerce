import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { IObjectStorageProvider, HeadObjectResult } from './interfaces/object-storage.interface';

export interface CloudflareR2Config {
  endpoint: string;
  region?: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicAssetsBaseUrl: string;
}

@Injectable()
export class CloudflareR2Provider implements IObjectStorageProvider {
  private readonly logger = new Logger(CloudflareR2Provider.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly publicAssetsBaseUrl: string;

  constructor(config: CloudflareR2Config) {
    this.bucket = config.bucket;
    this.publicAssetsBaseUrl = config.publicAssetsBaseUrl.replace(/\/+$/, '');

    this.s3Client = new S3Client({
      endpoint: config.endpoint,
      region: config.region || 'auto',
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    this.logger.log(
      `Cloudflare R2 Provider initialized with bucket: "${this.bucket}", endpoint: "${config.endpoint}"`,
    );
  }

  async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds: number,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
  }

  async getPresignedDownloadUrl(key: string, expiresInSeconds: number): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
  }

  async headObject(key: string): Promise<HeadObjectResult> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      return {
        exists: true,
        contentLength: response.ContentLength,
        contentType: response.ContentType,
        checksum: response.ETag?.replace(/"/g, ''),
        metadata: response.Metadata,
      };
    } catch (error: unknown) {
      const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return { exists: false };
      }
      this.logger.error(`Error querying headObject for key "${key}":`, error);
      throw error;
    }
  }

  async getObjectBuffer(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    if (!response.Body) {
      throw new Error(`Empty body returned from object storage for key: ${key}`);
    }

    if (Buffer.isBuffer(response.Body)) {
      return response.Body;
    }

    if (response.Body instanceof Readable) {
      const chunks: Buffer[] = [];
      for await (const chunk of response.Body) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    }

    // Web ReadableStream or Uint8Array transform
    const byteArray = await (
      response.Body as { transformToByteArray?: () => Promise<Uint8Array> }
    ).transformToByteArray?.();
    if (byteArray) {
      return Buffer.from(byteArray);
    }

    throw new Error(`Unsupported body stream format for key: ${key}`);
  }

  async deleteObject(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.s3Client.send(command);
      this.logger.log(`Deleted object from storage: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete object "${key}" from storage:`, error);
      throw error;
    }
  }

  getPublicUrl(key: string): string {
    const cleanKey = key.replace(/^\/+/, '');
    return `${this.publicAssetsBaseUrl}/${cleanKey}`;
  }

  isLiveVerified(): boolean {
    return true;
  }
}
