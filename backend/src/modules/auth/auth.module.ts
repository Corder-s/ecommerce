import { Module, Global } from '@nestjs/common';
import { TokenVerificationService } from './token-verifier.service';
import { IdentityService } from './identity.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PlatformRolesGuard } from './guards/platform-roles.guard';
import { TenantAccessGuard } from './guards/tenant-access.guard';
import { AuthVerificationController } from './auth-verification.controller';

@Global()
@Module({
  controllers: [AuthVerificationController],
  providers: [
    TokenVerificationService,
    IdentityService,
    JwtAuthGuard,
    PlatformRolesGuard,
    TenantAccessGuard,
  ],
  exports: [
    TokenVerificationService,
    IdentityService,
    JwtAuthGuard,
    PlatformRolesGuard,
    TenantAccessGuard,
  ],
})
export class AuthModule {}
