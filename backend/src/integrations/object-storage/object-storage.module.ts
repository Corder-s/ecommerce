import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OBJECT_STORAGE_PROVIDER_TOKEN,
  OBJECT_STORAGE_PROVIDER,
} from './interfaces/object-storage.interface';
import { CloudflareR2Provider } from './cloudflare-r2.provider';
import { SandboxObjectStorageProvider } from './sandbox-object-storage.provider';

@Global()
@Module({
  providers: [
    {
      provide: OBJECT_STORAGE_PROVIDER_TOKEN,
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('ObjectStorageModule');
        const providerName = configService.get<string>('storage.provider') || 'sandbox';
        const endpoint = configService.get<string>('storage.endpoint');
        const bucket = configService.get<string>('storage.bucket') || 'gaushilp-media';
        const accessKeyId = configService.get<string>('storage.accessKeyId');
        const secretAccessKey = configService.get<string>('storage.secretAccessKey');
        const region = configService.get<string>('storage.region') || 'auto';
        const publicAssetsBaseUrl =
          configService.get<string>('storage.publicAssetsBaseUrl') ||
          'https://media.gaushilp.example.com';

        // Check if live Cloudflare R2 credentials are fully configured
        if (
          providerName === 'r2' ||
          (endpoint && accessKeyId && secretAccessKey && accessKeyId !== 'your_r2_access_key_id')
        ) {
          logger.log(`Connecting to Cloudflare R2 object storage (endpoint: ${endpoint})`);
          return new CloudflareR2Provider({
            endpoint: endpoint!,
            region,
            bucket,
            accessKeyId: accessKeyId!,
            secretAccessKey: secretAccessKey!,
            publicAssetsBaseUrl,
          });
        }

        logger.warn(
          'Cloudflare R2 live credentials not configured. Falling back to SandboxObjectStorageProvider.',
        );
        return new SandboxObjectStorageProvider(publicAssetsBaseUrl);
      },
      inject: [ConfigService],
    },
    {
      provide: OBJECT_STORAGE_PROVIDER,
      useExisting: OBJECT_STORAGE_PROVIDER_TOKEN,
    },
  ],
  exports: [OBJECT_STORAGE_PROVIDER_TOKEN, OBJECT_STORAGE_PROVIDER],
})
export class ObjectStorageModule {}
