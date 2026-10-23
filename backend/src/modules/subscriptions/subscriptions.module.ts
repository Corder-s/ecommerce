import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { SubscriptionProviderModule } from '../../integrations/subscription-provider';
import { OutboxModule } from '../outbox/outbox.module';
import { SubscriptionsService } from './subscriptions.service';
import { EntitlementsService } from './entitlements.service';
import { SubscriptionsController } from './subscriptions.controller';

@Module({
  imports: [PrismaModule, ConfigModule, SubscriptionProviderModule, OutboxModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, EntitlementsService],
  exports: [SubscriptionsService, EntitlementsService],
})
export class SubscriptionsModule {}
