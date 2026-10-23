import { Injectable, NotFoundException, Logger, Optional, Inject } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateStoreDto } from './dto/update-store.dto';
import { ProductStatus } from '@prisma/client';
import { FilesService } from '../files/files.service';
import { CACHE_SERVICE, ICacheService, CacheKeys, CacheTTL } from '../../common/cache';

@Injectable()
export class StoresService {
  private readonly logger = new Logger(StoresService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly filesService?: FilesService,
    @Optional() @Inject(CACHE_SERVICE) private readonly cacheService?: ICacheService,
  ) {}

  /**
   * Retrieves full store details for an authenticated tenant member.
   */
  async getCurrentStore(tenantId: string) {
    const store = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        _count: {
          select: {
            products: true,
            categories: true,
            memberships: true,
          },
        },
      },
    });

    if (!store) {
      throw new NotFoundException(`Store with ID "${tenantId}" not found`);
    }

    return store;
  }

  /**
   * Updates store branding, contact info, and business details.
   */
  async updateStore(tenantId: string, dto: UpdateStoreDto) {
    // Verify store exists
    await this.getCurrentStore(tenantId);

    // Verify logo and banner files belong to this tenant (prevent cross-tenant media hijacking)
    const mediaUrls = [dto.logoUrl, dto.bannerUrl].filter(
      (u): u is string => typeof u === 'string' && u.trim().length > 0,
    );
    if (mediaUrls.length > 0 && this.filesService) {
      await this.filesService.assertFilesBelongToTenant(tenantId, mediaUrls);
    }

    const updatedStore = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...dto,
      },
    });

    // Invalidate cached store data
    await this.cacheService?.del(CacheKeys.publicStore(updatedStore.storeSlug));
    await this.cacheService?.delByPattern(CacheKeys.tenantProductsPattern(tenantId));

    this.logger.log(`Updated store settings for tenant: ${tenantId}`);
    return updatedStore;
  }

  /**
   * Publishes the store so it becomes accessible to public customers.
   */
  async publishStore(tenantId: string) {
    await this.getCurrentStore(tenantId);

    const publishedStore = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        isPublished: true,
        publishedAt: new Date(),
      },
    });

    // Invalidate cached store data
    await this.cacheService?.del(CacheKeys.publicStore(publishedStore.storeSlug));
    await this.cacheService?.delByPattern(CacheKeys.tenantProductsPattern(tenantId));

    this.logger.log(`Store published: ${publishedStore.storeSlug} (${tenantId})`);
    return {
      message: 'Store published successfully',
      store: publishedStore,
    };
  }

  /**
   * Unpublishes the store, hiding it from public storefront endpoints.
   */
  async unpublishStore(tenantId: string) {
    await this.getCurrentStore(tenantId);

    const unpublishedStore = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        isPublished: false,
      },
    });

    // Invalidate cached store data
    await this.cacheService?.del(CacheKeys.publicStore(unpublishedStore.storeSlug));
    await this.cacheService?.delByPattern(CacheKeys.tenantProductsPattern(tenantId));

    this.logger.log(`Store unpublished: ${unpublishedStore.storeSlug} (${tenantId})`);
    return {
      message: 'Store unpublished successfully',
      store: unpublishedStore,
    };
  }

  /**
   * Public endpoint: Retrieve published store details by storeSlug.
   * Unpublished stores are rejected with 404.
   */
  async getPublicStoreBySlug(slug: string) {
    const cacheKey = CacheKeys.publicStore(slug);
    const cached = await this.cacheService?.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const store = await this.prisma.tenant.findUnique({
      where: { storeSlug: slug },
      select: {
        id: true,
        businessName: true,
        storeSlug: true,
        description: true,
        logoUrl: true,
        bannerUrl: true,
        contactEmail: true,
        contactPhone: true,
        address: true,
        currency: true,
        status: true,
        isPublished: true,
        publishedAt: true,
        categories: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
      },
    });

    if (!store || !store.isPublished || store.status !== 'ACTIVE') {
      throw new NotFoundException('Store not found or is currently unpublished');
    }

    await this.cacheService?.set(cacheKey, store, CacheTTL.STORE);
    return store;
  }

  /**
   * Public endpoint: Retrieve published products of a published store by storeSlug.
   * Only returns products with status: PUBLISHED.
   */
  async getPublicStoreProducts(
    slug: string,
    options: { page?: number; limit?: number; categoryId?: string },
  ) {
    const store = await this.getPublicStoreBySlug(slug);

    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(options.limit) || 20));
    const skip = (page - 1) * limit;

    const cacheKey = CacheKeys.tenantProducts(store.id, page, limit, options.categoryId);
    const cached = await this.cacheService?.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const whereClause: any = {
      tenantId: store.id,
      status: ProductStatus.PUBLISHED,
    };

    if (options.categoryId) {
      whereClause.categoryId = options.categoryId;
    }

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where: whereClause }),
      this.prisma.product.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          price: true,
          currency: true,
          sku: true,
          images: true,
          createdAt: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const result = {
      store: {
        id: store.id,
        businessName: store.businessName,
        storeSlug: store.storeSlug,
      },
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    await this.cacheService?.set(cacheKey, result, CacheTTL.PRODUCTS);
    return result;
  }

  /**
   * Public endpoint: Retrieve published categories for a store.
   */
  async getPublicStoreCategories(slug: string) {
    const store = await this.getPublicStoreBySlug(slug);
    const cacheKey = CacheKeys.tenantCategories(store.id);
    const cached = await this.cacheService?.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const categories = await this.prisma.category.findMany({
      where: { tenantId: store.id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        _count: {
          select: {
            products: {
              where: { status: ProductStatus.PUBLISHED },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const result = {
      store: {
        id: store.id,
        businessName: store.businessName,
        storeSlug: store.storeSlug,
      },
      data: categories,
    };

    await this.cacheService?.set(cacheKey, result, CacheTTL.CATEGORIES);
    return result;
  }

  /**
   * Public endpoint: Retrieve details of a single published product by slug.
   */
  async getPublicProductBySlug(storeSlug: string, productSlug: string) {
    const store = await this.getPublicStoreBySlug(storeSlug);
    const cacheKey = CacheKeys.tenantProduct(store.id, productSlug);
    const cached = await this.cacheService?.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const product = await this.prisma.product.findFirst({
      where: {
        tenantId: store.id,
        slug: productSlug,
        status: ProductStatus.PUBLISHED,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        price: true,
        currency: true,
        sku: true,
        stock: true,
        images: true,
        createdAt: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with slug "${productSlug}" not found in this store.`);
    }

    const result = {
      store: {
        id: store.id,
        businessName: store.businessName,
        storeSlug: store.storeSlug,
      },
      product,
    };

    await this.cacheService?.set(cacheKey, result, CacheTTL.PRODUCT);
    return result;
  }
}
