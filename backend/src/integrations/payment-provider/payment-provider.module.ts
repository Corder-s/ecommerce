import { Module } from '@nestjs/common';
import { SandboxPaymentProvider } from './sandbox-payment.provider';

export const PAYMENT_PROVIDER_TOKEN = 'PAYMENT_PROVIDER_TOKEN';

@Module({
  providers: [
    SandboxPaymentProvider,
    {
      provide: PAYMENT_PROVIDER_TOKEN,
      useExisting: SandboxPaymentProvider,
    },
  ],
  exports: [PAYMENT_PROVIDER_TOKEN, SandboxPaymentProvider],
})
export class PaymentProviderModule {}
