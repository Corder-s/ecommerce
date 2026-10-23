import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { TenantRole } from '@prisma/client';
import { StoresService } from './stores.service';
import { UpdateStoreDto } from './dto/update-store.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantAccessGuard } from '../auth/guards/tenant-access.guard';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { RequireTenantRole } from '../auth/decorators/roles.decorator';
import { TenantContext } from '../auth/interfaces/auth.interface';

@ApiTags('Store Management (Seller)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantAccessGuard)
@Controller('stores/current')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get()
  @ApiOperation({ summary: 'Get current store details for authenticated tenant' })
  @ApiResponse({ status: 200, description: 'Store details returned' })
  @ApiResponse({ status: 403, description: 'Forbidden: unauthorized cross-tenant request' })
  async getCurrentStore(@CurrentTenant() tenant: TenantContext) {
    return this.storesService.getCurrentStore(tenant.tenantId);
  }

  @Patch()
  @RequireTenantRole(TenantRole.STORE_OWNER)
  @ApiOperation({ summary: 'Update store branding, contact information, and settings' })
  @ApiResponse({ status: 200, description: 'Store settings updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires STORE_OWNER role' })
  async updateStore(@CurrentTenant() tenant: TenantContext, @Body() dto: UpdateStoreDto) {
    return this.storesService.updateStore(tenant.tenantId, dto);
  }

  @Post('publish')
  @HttpCode(HttpStatus.OK)
  @RequireTenantRole(TenantRole.STORE_OWNER)
  @ApiOperation({ summary: 'Publish store to make it accessible to public customers' })
  @ApiResponse({ status: 200, description: 'Store published successfully' })
  async publishStore(@CurrentTenant() tenant: TenantContext) {
    return this.storesService.publishStore(tenant.tenantId);
  }

  @Post('unpublish')
  @HttpCode(HttpStatus.OK)
  @RequireTenantRole(TenantRole.STORE_OWNER)
  @ApiOperation({ summary: 'Unpublish store to take it offline from public storefront' })
  @ApiResponse({ status: 200, description: 'Store unpublished successfully' })
  async unpublishStore(@CurrentTenant() tenant: TenantContext) {
    return this.storesService.unpublishStore(tenant.tenantId);
  }
}
