import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
  Optional,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CACHE_SERVICE, ICacheService, CacheKeys, CacheTTL } from '../../common/cache';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(CACHE_SERVICE) private readonly cacheService?: ICacheService,
  ) {}

  /**
   * Creates a new category scoped to the authorized tenant.
   */
  async createCategory(tenantId: string, dto: CreateCategoryDto) {
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);

    // Verify slug uniqueness within this tenant
    const existing = await this.prisma.category.findUnique({
      where: {
        tenantId_slug: {
          tenantId,
          slug,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Category with slug "${slug}" already exists in this store.`);
    }

    const category = await this.prisma.category.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        slug,
        description: dto.description?.trim(),
      },
    });

    this.logger.log(`Created category "${category.name}" (${category.id}) for tenant: ${tenantId}`);

    // Invalidate cached categories and products for this tenant
    await this.cacheService?.delByPattern(CacheKeys.tenantCategoriesPattern(tenantId));
    await this.cacheService?.delByPattern(CacheKeys.tenantProductsPattern(tenantId));

    return category;
  }

  /**
   * Lists all categories for the tenant.
   */
  async listCategories(tenantId: string) {
    const cacheKey = CacheKeys.tenantCategories(tenantId);
    const cached = await this.cacheService?.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const categories = await this.prisma.category.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    await this.cacheService?.set(cacheKey, categories, CacheTTL.CATEGORIES);
    return categories;
  }

  /**
   * Retrieves single category by ID, scoped to tenant.
   */
  async getCategoryById(tenantId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found in this store.`);
    }

    return category;
  }

  /**
   * Updates an existing category.
   */
  async updateCategory(tenantId: string, id: string, dto: UpdateCategoryDto) {
    await this.getCategoryById(tenantId, id);

    let newSlug: string | undefined = undefined;
    if (dto.slug || dto.name) {
      newSlug = dto.slug ? slugify(dto.slug) : dto.name ? slugify(dto.name) : undefined;
    }

    if (newSlug) {
      const existing = await this.prisma.category.findFirst({
        where: {
          tenantId,
          slug: newSlug,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException(
          `Another category with slug "${newSlug}" already exists in this store.`,
        );
      }
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name ? dto.name.trim() : undefined,
        slug: newSlug || undefined,
        description: dto.description !== undefined ? dto.description.trim() : undefined,
      },
    });

    this.logger.log(`Updated category "${updated.id}" for tenant: ${tenantId}`);

    // Invalidate cached categories and products for this tenant
    await this.cacheService?.delByPattern(CacheKeys.tenantCategoriesPattern(tenantId));
    await this.cacheService?.delByPattern(CacheKeys.tenantProductsPattern(tenantId));

    return updated;
  }

  /**
   * Deletes a category. Prevents deletion if the category still contains products.
   */
  async deleteCategory(tenantId: string, id: string) {
    await this.getCategoryById(tenantId, id);

    // Enforce safety rule: Prevent deleting categories that contain products
    const productCount = await this.prisma.product.count({
      where: { tenantId, categoryId: id },
    });

    if (productCount > 0) {
      throw new BadRequestException(
        `Cannot delete category: It contains ${productCount} product(s). Reassign or remove these products before deleting the category.`,
      );
    }

    await this.prisma.category.delete({
      where: { id },
    });

    this.logger.log(`Deleted category "${id}" for tenant: ${tenantId}`);

    // Invalidate cached categories and products for this tenant
    await this.cacheService?.delByPattern(CacheKeys.tenantCategoriesPattern(tenantId));
    await this.cacheService?.delByPattern(CacheKeys.tenantProductsPattern(tenantId));

    return {
      message: 'Category deleted successfully',
      id,
    };
  }
}
