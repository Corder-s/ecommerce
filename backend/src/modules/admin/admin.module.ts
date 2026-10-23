import { Module } from '@nestjs/common';
import { AuditService } from './audit/audit.service';
import { AdminTenantsService } from './services/admin-tenants.service';
import { AdminUsersService } from './services/admin-users.service';
import { AdminSubscriptionsService } from './services/admin-subscriptions.service';
import { AdminAnalyticsService } from './services/admin-analytics.service';
import { AdminHealthService } from './services/admin-health.service';
import { AdminTenantsController } from './controllers/admin-tenants.controller';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminSubscriptionsController } from './controllers/admin-subscriptions.controller';
import { AdminAnalyticsController } from './controllers/admin-analytics.controller';
import { AdminHealthController } from './controllers/admin-health.controller';
import { AdminAuditLogsController } from './controllers/admin-audit-logs.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [
    AdminTenantsController,
    AdminUsersController,
    AdminSubscriptionsController,
    AdminAnalyticsController,
    AdminHealthController,
    AdminAuditLogsController,
  ],
  providers: [
    AuditService,
    AdminTenantsService,
    AdminUsersService,
    AdminSubscriptionsService,
    AdminAnalyticsService,
    AdminHealthService,
  ],
  exports: [
    AuditService,
    AdminTenantsService,
    AdminUsersService,
    AdminSubscriptionsService,
    AdminAnalyticsService,
    AdminHealthService,
  ],
})
export class AdminModule {}
