import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ShippingProviderModule } from '../../integrations/shipping-provider';
import { OutboxModule } from '../outbox/outbox.module';
import { ShippingService } from './shipping.service';
import { ShippingController } from './shipping.controller';

@Module({
  imports: [PrismaModule, ShippingProviderModule, OutboxModule],
  controllers: [ShippingController],
  providers: [ShippingService],
  exports: [ShippingService],
})
export class ShippingModule {}
