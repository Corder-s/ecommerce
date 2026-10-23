import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { TenantRole } from '@prisma/client';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantAccessGuard } from '../auth/guards/tenant-access.guard';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { RequireTenantRole } from '../auth/decorators/roles.decorator';
import { TenantContext } from '../auth/interfaces/auth.interface';

@ApiTags('Product Catalogue (Seller)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantAccessGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List products in current store with filters & pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of products' })
  async listProducts(@CurrentTenant() tenant: TenantContext, @Query() query: ProductQueryDto) {
    return this.productsService.listProducts(tenant.tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product details by ID' })
  @ApiResponse({ status: 200, description: 'Product details' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProduct(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.productsService.getProductById(tenant.tenantId, id);
  }

  @Post()
  @RequireTenantRole(TenantRole.STORE_OWNER, TenantRole.STORE_MANAGER)
  @ApiOperation({ summary: 'Create a new product in current store' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 400, description: 'Cross-tenant category or invalid price' })
  @ApiResponse({ status: 409, description: 'Product slug or SKU already exists' })
  async createProduct(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateProductDto) {
    return this.productsService.createProduct(tenant.tenantId, dto);
  }

  @Patch(':id')
  @RequireTenantRole(TenantRole.STORE_OWNER, TenantRole.STORE_MANAGER)
  @ApiOperation({ summary: 'Update product details' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 400, description: 'Cross-tenant category assignment' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async updateProduct(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.updateProduct(tenant.tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequireTenantRole(TenantRole.STORE_OWNER, TenantRole.STORE_MANAGER)
  @ApiOperation({ summary: 'Archive a product' })
  @ApiResponse({ status: 200, description: 'Product archived successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async deleteProduct(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.productsService.deleteProduct(tenant.tenantId, id);
  }
}
