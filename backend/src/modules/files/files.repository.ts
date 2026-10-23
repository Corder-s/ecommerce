import { Injectable } from '@nestjs/common';
import { Prisma, StoredFile, FileStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class FilesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.StoredFileCreateInput): Promise<StoredFile> {
    return this.prisma.storedFile.create({ data });
  }

  async findById(id: string): Promise<StoredFile | null> {
    return this.prisma.storedFile.findUnique({ where: { id } });
  }

  async findByObjectKey(objectKey: string): Promise<StoredFile | null> {
    return this.prisma.storedFile.findUnique({ where: { objectKey } });
  }

  async update(id: string, data: Prisma.StoredFileUpdateInput): Promise<StoredFile> {
    return this.prisma.storedFile.update({
      where: { id },
      data,
    });
  }

  async findMany(params: {
    where: Prisma.StoredFileWhereInput;
    skip: number;
    take: number;
  }): Promise<StoredFile[]> {
    return this.prisma.storedFile.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async count(where: Prisma.StoredFileWhereInput): Promise<number> {
    return this.prisma.storedFile.count({ where });
  }

  /**
   * Checks whether a public asset URL or file ID is actively referenced in products or store branding.
   */
  async checkActiveReferences(
    publicUrl: string | null,
  ): Promise<{ isReferenced: boolean; productCount: number; storeCount: number }> {
    if (!publicUrl) {
      return { isReferenced: false, productCount: 0, storeCount: 0 };
    }

    const [productCount, storeCount] = await Promise.all([
      this.prisma.product.count({
        where: {
          images: {
            has: publicUrl,
          },
        },
      }),
      this.prisma.tenant.count({
        where: {
          OR: [{ logoUrl: publicUrl }, { bannerUrl: publicUrl }],
        },
      }),
    ]);

    return {
      isReferenced: productCount > 0 || storeCount > 0,
      productCount,
      storeCount,
    };
  }

  /**
   * Finds pending upload intents created before a given timestamp.
   */
  async findAbandonedUploads(cutoffDate: Date): Promise<StoredFile[]> {
    return this.prisma.storedFile.findMany({
      where: {
        status: FileStatus.PENDING,
        createdAt: {
          lt: cutoffDate,
        },
      },
      take: 100,
    });
  }

  /**
   * Finds verified/attached files belonging to a specific tenant for assertion checks.
   */
  async findTenantFiles(tenantId: string, identifiers: string[]): Promise<StoredFile[]> {
    return this.prisma.storedFile.findMany({
      where: {
        tenantId,
        OR: [
          { id: { in: identifiers } },
          { publicUrl: { in: identifiers } },
          { objectKey: { in: identifiers } },
        ],
      },
    });
  }
}
