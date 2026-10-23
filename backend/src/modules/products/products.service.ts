import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
  Optional,
  Inject,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { slugify } from '../categories/categories.service';
import { EntitlementsService } from '../subscriptions/entitlements.service';
import { FilesService } from '../files/files.service';
import { CACHE_SERVICE, ICacheService, CacheKeys } from '../../common/cache';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly entitlementsService?: EntitlementsService,
    @Optional() private readonly filesService?: FilesService,
    @Optional() @Inject(CACHE_SERVICE) private readonly cacheService?: ICacheService,
  ) {}

  /**
   * Creates a product scoped strictly to the authorized tenant.
   * Enforces subscription plan limits, cross-tenant category isolation, price validation, and slug/SKU uniqueness.
   */
  async createProduct(tenantId: string, dto: CreateProductDto) {
    // 0. Enforce subscription entitlement limits
    if (this.entitlementsService) {
      await this.entitlementsService.assertCanAddProduct(tenantId);
    }

    // 1. Verify category belongs to this tenant (prevent cross-tenant category linking)
    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, tenantId },
      });

      if (!category) {
        throw new BadRequestException(
          `Cross-tenant category assignment rejected: Category "${dto.categoryId}" does not belong to this store.`,
        );
      }
    }

    // 2. Generate and verify slug uniqueness within this tenant
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);
    const existingSlug = await this.prisma.product.findUnique({
      where: {
        tenantId_slug: {
          tenantId,
          slug,
        },
      },
    });

    if (existingSlug) {
      throw new ConflictException(`Product with slug "${slug}" already exists in this store.`);
    }

    // 3. Verify SKU uniqueness within this tenant if SKU is provided
    if (dto.sku) {
      const existingSku = await this.prisma.product.findUnique({
        where: {
          tenantId_sku: {
            tenantId,
            sku: dto.sku,
          },
        },
      });

      if (existingSku) {
        throw new ConflictException(`Product with SKU "${dto.sku}" already exists in this store.`);
      }
    }

    // 3.5. Verify image attachments belong to this tenant (prevent cross-tenant asset linking)
    if (dto.images && dto.images.length > 0 && this.filesService) {
      await this.filesService.assertFilesBelongToTenant(tenantId, dto.images);
    }

    // 4. Create product with precise Decimal price
    const product = await this.prisma.product.create({
      data: {
        tenantId,
        categoryId: dto.categoryId || null,
        name: dto.name.trim(),
        slug,
        description: dto.description?.trim(),
        price: new Prisma.Decimal(dto.price),
        currency: dto.currency || 'INR',
        sku: dto.sku?.trim() || null,
        stock: dto.stock !== undefined ? dto.stock : 0,
        status: dto.status || 'DRAFT',
        images: dto.images || [],
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    this.logger.log(`Created product "${product.name}" (${product.id}) for tenant: ${tenantId}`);

    // Invalidate product listings cache for this tenant
    await this.cacheService?.delByPattern(CacheKeys.tenantProductsPattern(tenantId));

    return product;
  }

  /**
   * Lists products for the authorized tenant with pagination and filters.
   */
  async listProducts(tenantId: string, query: ProductQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const whereClause: Prisma.ProductWhereInput = {
      tenantId,
    };

    if (query.status) {
      whereClause.status = query.status;
    }

    if (query.categoryId) {
      whereClause.categoryId = query.categoryId;
    }

    if (query.search) {
      whereClause.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where: whereClause }),
      this.prisma.product.findMany({
        where: whereClause,
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves single product by ID scoped strictly to authorized tenant.
   */
  async getProductById(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found in this store.`);
    }

    return product;
  }

  /**
   * Updates product details with category ownership verification and SKU uniqueness.
   */
  async updateProduct(tenantId: string, id: string, dto: UpdateProductDto) {
    await this.getProductById(tenantId, id);

    // 1. Verify category ownership if updated
    if (dto.categoryId !== undefined) {
      if (dto.categoryId !== null) {
        const category = await this.prisma.category.findFirst({
          where: { id: dto.categoryId, tenantId },
        });

        if (!category) {
          throw new BadRequestException(
            `Cross-tenant category assignment rejected: Category "${dto.categoryId}" does not belong to this store.`,
          );
        }
      }
    }

    // 2. Verify slug uniqueness if slug or name is updated
    let newSlug: string | undefined = undefined;
    if (dto.slug || dto.name) {
      newSlug = dto.slug ? slugify(dto.slug) : dto.name ? slugify(dto.name) : undefined;
    }

    if (newSlug) {
      const existing = await this.prisma.product.findFirst({
        where: {
          tenantId,
          slug: newSlug,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException(
          `Another product with slug "${newSlug}" already exists in this store.`,
        );
      }
    }

    // 3. Verify SKU uniqueness if updated
    if (dto.sku) {
      const existingSku = await this.prisma.product.findFirst({
        where: {
          tenantId,
          sku: dto.sku,
          NOT: { id },
        },
      });

      if (existingSku) {
        throw new ConflictException(
          `Another product with SKU "${dto.sku}" already exists in this store.`,
        );
      }
    }

    // 4. Verify image attachments belong to this tenant
    if (dto.images && dto.images.length > 0 && this.filesService) {
      await this.filesService.assertFilesBelongToTenant(tenantId, dto.images);
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name ? dto.name.trim() : undefined,
        slug: newSlug || undefined,
        description: dto.description !== undefined ? dto.description.trim() : undefined,
        price: dto.price !== undefined ? new Prisma.Decimal(dto.price) : undefined,
        currency: dto.currency || undefined,
        sku: dto.sku !== undefined ? (dto.sku ? dto.sku.trim() : null) : undefined,
        categoryId: dto.categoryId !== undefined ? dto.categoryId : undefined,
        stock: dto.stock !== undefined ? dto.stock : undefined,
        status: dto.status || undefined,
        images: dto.images || undefined,
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    this.logger.log(`Updated product "${updated.id}" for tenant: ${tenantId}`);

    // Invalidate product listings and individual product cache
    await this.cacheService?.delByPattern(CacheKeys.tenantProductsPattern(tenantId));
    await this.cacheService?.del(CacheKeys.tenantProduct(tenantId, updated.slug));

    return updated;
  }

  /**
   * Archives or deletes product.
   */
  async deleteProduct(tenantId: string, id: string) {
    await this.getProductById(tenantId, id);

    // Archive the product to preserve historical receipt and order consistency
    await this.prisma.product.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    this.logger.log(`Archived product "${id}" for tenant: ${tenantId}`);

    // Invalidate product listings and product cache
    await this.cacheService?.delByPattern(CacheKeys.tenantProductsPattern(tenantId));
    await this.cacheService?.delByPattern(CacheKeys.tenantProductPattern(tenantId));

    return {
      message: 'Product archived successfully',
      id,
    };
  }
}
