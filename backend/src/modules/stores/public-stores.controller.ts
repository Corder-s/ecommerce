import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { StoresService } from './stores.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Public Storefront')
@Public()
@Controller('public/stores')
export class PublicStoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get(':slug')
  @ApiOperation({ summary: 'Get published store details by unique storeSlug' })
  @ApiResponse({ status: 200, description: 'Store details returned' })
  @ApiResponse({ status: 404, description: 'Store not found or unpublished' })
  async getPublicStore(@Param('slug') slug: string) {
    return this.storesService.getPublicStoreBySlug(slug);
  }

  @Get(':slug/categories')
  @ApiOperation({ summary: 'Browse categories for a published store' })
  @ApiResponse({ status: 200, description: 'Store categories returned' })
  @ApiResponse({ status: 404, description: 'Store not found or unpublished' })
  async getPublicStoreCategories(@Param('slug') slug: string) {
    return this.storesService.getPublicStoreCategories(slug);
  }

  @Get(':slug/products')
  @ApiOperation({ summary: 'Browse published products for a published store' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Published products returned with pagination' })
  @ApiResponse({ status: 404, description: 'Store not found or unpublished' })
  async getPublicStoreProducts(
    @Param('slug') slug: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.storesService.getPublicStoreProducts(slug, {
      page,
      limit,
      categoryId,
    });
  }

  @Get(':slug/products/:productSlug')
  @ApiOperation({ summary: 'Retrieve published product details by slug' })
  @ApiResponse({ status: 200, description: 'Product details returned' })
  @ApiResponse({ status: 404, description: 'Product not found or store unpublished' })
  async getPublicProduct(@Param('slug') slug: string, @Param('productSlug') productSlug: string) {
    return this.storesService.getPublicProductBySlug(slug, productSlug);
  }
}
