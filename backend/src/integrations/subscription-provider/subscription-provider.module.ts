import { Module } from '@nestjs/common';
import { SandboxSubscriptionProvider } from './sandbox-subscription.provider';

export const SUBSCRIPTION_PROVIDER_TOKEN = 'SUBSCRIPTION_PROVIDER_TOKEN';

@Module({
  providers: [
    SandboxSubscriptionProvider,
    {
      provide: SUBSCRIPTION_PROVIDER_TOKEN,
      useExisting: SandboxSubscriptionProvider,
    },
  ],
  exports: [SUBSCRIPTION_PROVIDER_TOKEN, SandboxSubscriptionProvider],
})
export class SubscriptionProviderModule {}
