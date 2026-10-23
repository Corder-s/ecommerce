import { Module } from '@nestjs/common';
import { SandboxEmailProvider } from './sandbox-email.provider';

export const EMAIL_PROVIDER_TOKEN = 'EMAIL_PROVIDER_TOKEN';
export const EMAIL_PROVIDER = EMAIL_PROVIDER_TOKEN;

@Module({
  providers: [
    SandboxEmailProvider,
    {
      provide: EMAIL_PROVIDER_TOKEN,
      useExisting: SandboxEmailProvider,
    },
  ],
  exports: [EMAIL_PROVIDER_TOKEN, SandboxEmailProvider],
})
export class EmailProviderModule {}
