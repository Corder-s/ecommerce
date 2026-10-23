import { Module } from '@nestjs/common';
import { SandboxShippingProvider } from './sandbox-shipping.provider';

export const SHIPPING_PROVIDER_TOKEN = 'SHIPPING_PROVIDER_TOKEN';

@Module({
  providers: [
    SandboxShippingProvider,
    {
      provide: SHIPPING_PROVIDER_TOKEN,
      useExisting: SandboxShippingProvider,
    },
  ],
  exports: [SHIPPING_PROVIDER_TOKEN, SandboxShippingProvider],
})
export class ShippingProviderModule {}
