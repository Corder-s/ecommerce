import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { TenantRole } from '@prisma/client';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantAccessGuard } from '../auth/guards/tenant-access.guard';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { RequireTenantRole } from '../auth/decorators/roles.decorator';
import { TenantContext } from '../auth/interfaces/auth.interface';

@ApiTags('Product Categories (Seller)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantAccessGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all categories in current store' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  async listCategories(@CurrentTenant() tenant: TenantContext) {
    return this.categoriesService.listCategories(tenant.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category details by ID' })
  @ApiResponse({ status: 200, description: 'Category details' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async getCategory(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.categoriesService.getCategoryById(tenant.tenantId, id);
  }

  @Post()
  @RequireTenantRole(TenantRole.STORE_OWNER, TenantRole.STORE_MANAGER)
  @ApiOperation({ summary: 'Create a new category in current store' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 409, description: 'Category slug already exists' })
  async createCategory(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.createCategory(tenant.tenantId, dto);
  }

  @Patch(':id')
  @RequireTenantRole(TenantRole.STORE_OWNER, TenantRole.STORE_MANAGER)
  @ApiOperation({ summary: 'Update an existing category' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async updateCategory(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.updateCategory(tenant.tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequireTenantRole(TenantRole.STORE_OWNER, TenantRole.STORE_MANAGER)
  @ApiOperation({ summary: 'Delete a category (only if empty of products)' })
  @ApiResponse({ status: 200, description: 'Category deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete category containing products' })
  async deleteCategory(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.categoriesService.deleteCategory(tenant.tenantId, id);
  }
}
