import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { HealthModule } from './modules/health/health.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { StoresModule } from './modules/stores/stores.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { CustomersModule } from './modules/customers/customers.module';
import { CartModule } from './modules/cart/cart.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { EmailProviderModule } from './integrations/email-provider';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { OutboxModule } from './modules/outbox/outbox.module';
import { ObjectStorageModule } from './integrations/object-storage';
import { FilesModule } from './modules/files/files.module';
import { AdminModule } from './modules/admin/admin.module';
import { CacheModule } from './common/cache/cache.module';
import { BackupModule } from './modules/backup/backup.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    AuthModule,
    StoresModule,
    CategoriesModule,
    ProductsModule,
    CustomersModule,
    CartModule,
    CheckoutModule,
    OrdersModule,
    PaymentsModule,
    SubscriptionsModule,
    ShippingModule,
    EmailProviderModule,
    NotificationsModule,
    JobsModule,
    OutboxModule,
    ObjectStorageModule,
    FilesModule,
    AdminModule,
    BackupModule,
    CacheModule,
    HealthModule,
  ],
})
export class AppModule {}
