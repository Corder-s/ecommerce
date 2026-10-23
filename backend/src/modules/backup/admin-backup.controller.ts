import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PlatformRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformRolesGuard } from '../auth/guards/platform-roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { BackupService } from './backup.service';

@ApiTags('Super Admin — Backups & Disaster Recovery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformRolesGuard, RateLimitGuard)
@Roles(PlatformRole.SUPER_ADMIN)
@Controller('admin/backups')
export class AdminBackupController {
  private readonly logger = new Logger(AdminBackupController.name);

  constructor(private readonly backupService: BackupService) {}

  @Get()
  @ApiOperation({
    summary: 'List all database backup manifests and verification status',
  })
  @ApiResponse({ status: 200, description: 'List of backup manifests' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires SUPER_ADMIN role' })
  async listBackups() {
    return this.backupService.listAllManifests();
  }

  @Get('status')
  @ApiOperation({
    summary: 'Get telemetry summary on backup health, storage, and RPO compliance',
  })
  @ApiResponse({ status: 200, description: 'Backup telemetry and RPO status' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires SUPER_ADMIN role' })
  async getStatus() {
    return this.backupService.getBackupStatusSummary();
  }

  @Post('trigger')
  @RateLimit({ limit: 5, ttlSeconds: 300 })
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Trigger an automated, encrypted database backup immediately',
  })
  @ApiResponse({ status: 202, description: 'Backup successfully initiated and completed' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires SUPER_ADMIN role' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async triggerBackup(@CurrentUser() user: AuthenticatedUser) {
    this.logger.log(`Backup triggered manually by SuperAdmin "${user.id}" (${user.email})`);
    return this.backupService.createDatabaseBackup();
  }

  @Post(':backupId/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify payload decryption and SHA-256 checksum integrity of a backup',
  })
  @ApiParam({ name: 'backupId', description: 'Unique backup identifier' })
  @ApiResponse({ status: 200, description: 'Integrity check result' })
  @ApiResponse({ status: 404, description: 'Backup manifest not found' })
  async verifyBackup(@Param('backupId') backupId: string) {
    const verified = await this.backupService.verifyBackupIntegrity(backupId);
    return {
      backupId,
      verified,
      message: verified
        ? 'Backup integrity verified: SHA-256 checksum and AES-256-GCM authentication valid.'
        : 'Backup verification failed: checksum mismatch or corrupted payload.',
    };
  }

  @Post(':backupId/restore-drill')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 3, ttlSeconds: 300 })
  @ApiOperation({
    summary: 'Execute an isolated test restoration drill to validate recoverable state',
  })
  @ApiParam({ name: 'backupId', description: 'Unique backup identifier' })
  @ApiResponse({ status: 200, description: 'Restore drill execution results' })
  @ApiResponse({ status: 404, description: 'Backup manifest not found' })
  async runRestoreDrill(
    @CurrentUser() user: AuthenticatedUser,
    @Param('backupId') backupId: string,
  ) {
    this.logger.log(`Restore drill initiated by SuperAdmin "${user.id}" for backup "${backupId}"`);
    return this.backupService.restoreDatabase(backupId);
  }

  @Post('prune')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 5, ttlSeconds: 300 })
  @ApiOperation({
    summary: 'Enforce backup retention policy (30 days default) with last-backup protection',
  })
  @ApiResponse({ status: 200, description: 'Retention enforcement result' })
  async pruneRetention() {
    return this.backupService.pruneExpiredBackups();
  }
}
