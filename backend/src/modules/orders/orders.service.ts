import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  Optional,
  Inject,
} from '@nestjs/common';
import {
  OrderStatus,
  PaymentStatus,
  ReservationStatus,
  ProductStatus,
  TenantStatus,
  PlatformRole,
  TenantRole,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { OrderResponse, OrderListResponse, MonetaryAmount } from './interfaces/order.interface';
import { OutboxService } from '../outbox/outbox.service';
import { DomainEventType } from '../outbox/interfaces/outbox.interface';
import { CACHE_SERVICE, ICacheService, CacheKeys } from '../../common/cache';

export const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PLACED]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.RETURNED],
  [OrderStatus.DELIVERED]: [OrderStatus.RETURNED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.RETURNED]: [],
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly outboxService?: OutboxService,
    @Optional() @Inject(CACHE_SERVICE) private readonly cacheService?: ICacheService,
  ) {}

  /**
   * Creates an order from a customer's active cart with atomic stock reservation
   * and idempotency protection.
   */
  async createOrder(
    user: AuthenticatedUser,
    dto: CreateOrderDto,
    idempotencyKeyHeader?: string,
  ): Promise<OrderResponse> {
    const idempotencyKey = idempotencyKeyHeader || dto.idempotencyKey;

    // 1. Check idempotency record if key provided
    if (idempotencyKey) {
      const existingIdempotency = await this.prisma.idempotencyRecord.findUnique({
        where: {
          userId_key_action: {
            userId: user.id,
            key: idempotencyKey,
            action: 'CREATE_ORDER',
          },
        },
      });

      if (existingIdempotency && existingIdempotency.expiresAt > new Date()) {
        this.logger.log(
          `Idempotent order creation hit for user: ${user.id}, key: ${idempotencyKey}`,
        );
        return existingIdempotency.response as unknown as OrderResponse;
      }
    }

    // 2. Load customer's active cart
    const cart = await this.prisma.cart.findUnique({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                tenant: true,
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Your shopping cart is empty');
    }

    // 3. Multi-seller cart policy: initial checkout requires one seller per order
    const sellerIds = Array.from(new Set(cart.items.map((item) => item.product.tenantId)));

    if (sellerIds.length > 1 && !dto.tenantId) {
      throw new BadRequestException(
        'Your cart contains items from multiple stores. Please specify a tenantId to order from one seller at a time.',
      );
    }

    const targetTenantId = dto.tenantId || sellerIds[0];
    const orderCartItems = cart.items.filter((item) => item.product.tenantId === targetTenantId);

    if (orderCartItems.length === 0) {
      throw new BadRequestException('No items in your cart belong to the specified store');
    }

    // 4. Validate seller store is active and published
    const store = orderCartItems[0].product.tenant;
    if (!store.isPublished || store.status !== TenantStatus.ACTIVE) {
      throw new BadRequestException(
        'The selected store is currently inactive or unavailable for order fulfillment',
      );
    }

    // 5. Resolve and validate delivery address
    let resolvedAddress: {
      fullName: string;
      phone: string;
      addressLine1: string;
      addressLine2?: string | null;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      landmark?: string | null;
    };

    if (dto.addressId) {
      const savedAddress = await this.prisma.customerAddress.findFirst({
        where: {
          id: dto.addressId,
          userId: user.id,
        },
      });

      if (!savedAddress) {
        throw new NotFoundException(
          'Delivery address not found or does not belong to your account',
        );
      }

      resolvedAddress = {
        fullName: savedAddress.fullName,
        phone: savedAddress.phone,
        addressLine1: savedAddress.addressLine1,
        addressLine2: savedAddress.addressLine2,
        city: savedAddress.city,
        state: savedAddress.state,
        postalCode: savedAddress.postalCode,
        country: savedAddress.country,
        landmark: savedAddress.landmark,
      };
    } else if (dto.shippingAddress) {
      resolvedAddress = {
        fullName: dto.shippingAddress.fullName,
        phone: dto.shippingAddress.phone,
        addressLine1: dto.shippingAddress.addressLine1,
        addressLine2: dto.shippingAddress.addressLine2 || null,
        city: dto.shippingAddress.city,
        state: dto.shippingAddress.state,
        postalCode: dto.shippingAddress.postalCode,
        country: dto.shippingAddress.country || 'IN',
        landmark: dto.shippingAddress.landmark || null,
      };
    } else {
      throw new BadRequestException(
        'Please provide a saved addressId or an inline shippingAddress for delivery',
      );
    }

    // 6. Validate product availability and pre-check stock using server-side DB records
    for (const item of orderCartItems) {
      if (item.product.status !== ProductStatus.PUBLISHED) {
        throw new BadRequestException(
          `Product "${item.product.name}" is no longer available for purchase`,
        );
      }

      if (item.product.stock < item.quantity) {
        throw new ConflictException(
          `Insufficient stock for product "${item.product.name}". Available: ${item.product.stock}, requested: ${item.quantity}`,
        );
      }
    }

    // 7. Calculate server-side totals (minor unit precision)
    let subtotalMinor = 0;
    for (const item of orderCartItems) {
      const unitPriceNum = Number(item.product.price);
      const lineMinor = Math.round(unitPriceNum * 100) * item.quantity;
      subtotalMinor += lineMinor;
    }

    const subtotalAmount = subtotalMinor / 100;
    const taxAmount = 0;
    const shippingAmount = 0;
    const totalAmount = subtotalAmount + taxAmount + shippingAmount;

    // Generate unique order number (e.g., GS-YYYYMMDD-XXXXX)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    const orderNumber = `GS-${dateStr}-${randPart}`;

    // 8. Execute atomic transaction: Decrement stock, create order, reserve inventory, clear cart items
    const createdOrder = await this.prisma.$transaction(async (tx) => {
      // 8a. Atomic stock decrement with conditional update to prevent overselling
      for (const item of orderCartItems) {
        const updateResult = await tx.product.updateMany({
          where: {
            id: item.productId,
            stock: { gte: item.quantity },
            status: ProductStatus.PUBLISHED,
          },
          data: {
            stock: { decrement: item.quantity },
          },
        });

        if (updateResult.count === 0) {
          throw new ConflictException(
            `Insufficient stock for "${item.product.name}". The remaining stock may have just been purchased by another customer.`,
          );
        }
      }

      // 8b. Create order record
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: user.id,
          tenantId: targetTenantId,
          status: OrderStatus.PLACED,
          paymentStatus: PaymentStatus.PENDING,
          currency: 'INR',
          subtotal: new Prisma.Decimal(subtotalAmount),
          taxAmount: new Prisma.Decimal(taxAmount),
          shippingAmount: new Prisma.Decimal(shippingAmount),
          totalAmount: new Prisma.Decimal(totalAmount),
          shippingAddress: resolvedAddress,
          customerNote: dto.customerNote?.trim() || null,
        },
      });

      // 8c. Create line items and inventory reservations
      for (const item of orderCartItems) {
        const unitPriceNum = Number(item.product.price);
        const lineSubtotalNum = (Math.round(unitPriceNum * 100) * item.quantity) / 100;

        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            productName: item.product.name,
            sku: item.product.sku,
            unitPrice: item.product.price,
            quantity: item.quantity,
            subtotal: new Prisma.Decimal(lineSubtotalNum),
          },
        });

        await tx.inventoryReservation.create({
          data: {
            tenantId: targetTenantId,
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            status: ReservationStatus.RESERVED,
          },
        });
      }

      // 8d. Initial order status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: null,
          toStatus: OrderStatus.PLACED,
          changedBy: user.id,
          reason: 'Order placed by customer',
        },
      });

      // 8e. Remove ordered items from the customer's cart
      await tx.cartItem.deleteMany({
        where: {
          id: { in: orderCartItems.map((item) => item.id) },
        },
      });

      // 8f. Transactional outbox event creation
      if (this.outboxService) {
        await this.outboxService.createEvent(
          {
            eventType: DomainEventType.ORDER_CREATED,
            tenantId: targetTenantId,
            payload: {
              orderId: order.id,
              orderNumber: order.orderNumber,
              userId: user.id,
              totalAmount,
              currency: 'INR',
            },
          },
          tx,
        );
      }

      return order;
    });

    const fullOrder = await this.getOrderEntityById(createdOrder.id);
    if (!fullOrder) {
      throw new NotFoundException('Order not found');
    }
    const response = this.mapOrderToResponse(fullOrder);

    // 9. Persist idempotency record if key was provided
    if (idempotencyKey) {
      await this.prisma.idempotencyRecord.create({
        data: {
          key: idempotencyKey,
          userId: user.id,
          action: 'CREATE_ORDER',
          response: response as unknown as Prisma.InputJsonValue,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24-hour retention
        },
      });
    }

    this.logger.log(
      `Order created successfully: ${createdOrder.orderNumber} (${createdOrder.id}) for user: ${user.id}`,
    );

    // Invalidate product catalog cache for this tenant so stock is accurate
    await this.cacheService?.delByPattern(CacheKeys.tenantProductsPattern(targetTenantId));
    await this.cacheService?.delByPattern(CacheKeys.tenantProductPattern(targetTenantId));

    return response;
  }

  /**
   * Retrieves an order by ID with ownership and tenant isolation enforcement.
   */
  async getOrderById(user: AuthenticatedUser, orderId: string): Promise<OrderResponse> {
    const order = await this.getOrderEntityById(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    this.assertOrderReadAccess(user, order);
    return this.mapOrderToResponse(order);
  }

  /**
   * Lists orders with pagination and role-based scoping (Customer vs Seller vs Admin).
   */
  async listOrders(user: AuthenticatedUser, query: OrderQueryDto): Promise<OrderListResponse> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    // Tenant / Store scoping
    if (query.tenantId) {
      // Caller must be an authorized member of this store or a super admin
      this.assertTenantStaff(user, query.tenantId);
      where.tenantId = query.tenantId;
    } else if (user.platformRole !== PlatformRole.SUPER_ADMIN) {
      // Default: Customer views their own orders
      where.userId = user.id;
    }

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          reservations: true,
          statusHistory: {
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
    ]);

    return {
      orders: orders.map((o) => this.mapOrderToResponse(o)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Updates order fulfillment status following the strict state machine.
   * Restricted to store staff and platform admins.
   */
  async updateOrderStatus(
    user: AuthenticatedUser,
    orderId: string,
    dto: UpdateOrderStatusDto,
  ): Promise<OrderResponse> {
    const order = await this.getOrderEntityById(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Customers cannot update order status directly
    this.assertTenantStaff(user, order.tenantId);

    // Validate state transition
    const allowedTransitions = VALID_ORDER_TRANSITIONS[order.status] || [];
    if (!allowedTransitions.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid status transition from "${order.status}" to "${dto.status}". Permitted transitions: ${
          allowedTransitions.join(', ') || 'None'
        }`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // If transitioning to CANCELLED, release stock reservations exactly once
      if (dto.status === OrderStatus.CANCELLED) {
        await this.releaseReservationsAndRestoreStock(tx, orderId);
      } else if (dto.status === OrderStatus.SHIPPED || dto.status === OrderStatus.DELIVERED) {
        // Mark reservations as fulfilled
        await tx.inventoryReservation.updateMany({
          where: {
            orderId,
            status: ReservationStatus.RESERVED,
          },
          data: {
            status: ReservationStatus.FULFILLED,
          },
        });
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: dto.status,
          ...(dto.status === OrderStatus.CANCELLED
            ? {
                cancelReason: dto.reason?.trim() || 'Cancelled by store staff',
                cancelledAt: new Date(),
              }
            : {}),
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: dto.status,
          changedBy: user.id,
          reason: dto.reason?.trim() || null,
        },
      });
    });

    const refreshed = await this.getOrderEntityById(orderId);
    if (!refreshed) {
      throw new NotFoundException('Order not found');
    }
    this.logger.log(
      `Order ${refreshed.orderNumber} status changed from ${order.status} to ${dto.status} by user ${user.id}`,
    );
    return this.mapOrderToResponse(refreshed);
  }

  /**
   * Cancels an order with inventory restoration.
   * Customers may cancel pre-shipment orders; sellers can cancel store orders.
   */
  async cancelOrder(
    user: AuthenticatedUser,
    orderId: string,
    dto: CancelOrderDto,
  ): Promise<OrderResponse> {
    const order = await this.getOrderEntityById(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Access control: Caller must be order owner or tenant staff
    const isOwner = order.userId === user.id;
    const isStaff = this.hasTenantStaffRole(user, order.tenantId);

    if (!isOwner && !isStaff && user.platformRole !== PlatformRole.SUPER_ADMIN) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Order is already cancelled');
    }

    // Pre-shipment cancellation only
    const cancellableStatuses: OrderStatus[] = [
      OrderStatus.PLACED,
      OrderStatus.CONFIRMED,
      OrderStatus.PROCESSING,
    ];

    if (!cancellableStatuses.includes(order.status)) {
      throw new BadRequestException(
        `Cannot cancel order with status "${order.status}". Orders that have already been shipped or completed cannot be cancelled.`,
      );
    }

    const cancelReason =
      dto.reason?.trim() || (isOwner ? 'Cancelled by customer' : 'Cancelled by store staff');

    await this.prisma.$transaction(async (tx) => {
      // Restore stock and release reservations atomically
      await this.releaseReservationsAndRestoreStock(tx, orderId);

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          cancelReason,
          cancelledAt: new Date(),
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: OrderStatus.CANCELLED,
          changedBy: user.id,
          reason: cancelReason,
        },
      });

      if (this.outboxService) {
        await this.outboxService.createEvent(
          {
            eventType: DomainEventType.ORDER_CANCELLED,
            tenantId: order.tenantId,
            payload: {
              orderId: order.id,
              orderNumber: order.orderNumber,
              userId: order.userId,
              reason: cancelReason,
            },
          },
          tx,
        );
      }
    });

    const refreshed = await this.getOrderEntityById(orderId);
    if (!refreshed) {
      throw new NotFoundException('Order not found');
    }
    this.logger.log(`Order ${refreshed.orderNumber} successfully cancelled by user ${user.id}`);

    // Invalidate product catalog cache for this tenant as stock was restored
    await this.cacheService?.delByPattern(CacheKeys.tenantProductsPattern(order.tenantId));
    await this.cacheService?.delByPattern(CacheKeys.tenantProductPattern(order.tenantId));

    return this.mapOrderToResponse(refreshed);
  }

  // ===========================================================================
  // Internal Helpers & Security Enforcements
  // ===========================================================================

  /**
   * Releases active inventory reservations for an order and restores product stock.
   * Guaranteed idempotent and exactly-once execution.
   */
  private async releaseReservationsAndRestoreStock(
    tx: Prisma.TransactionClient,
    orderId: string,
  ): Promise<void> {
    const activeReservations = await tx.inventoryReservation.findMany({
      where: {
        orderId,
        status: ReservationStatus.RESERVED,
      },
    });

    for (const res of activeReservations) {
      // Conditional update ensures reservation is transitioned from RESERVED only once
      const updateRes = await tx.inventoryReservation.updateMany({
        where: {
          id: res.id,
          status: ReservationStatus.RESERVED,
        },
        data: {
          status: ReservationStatus.RELEASED,
          releasedAt: new Date(),
        },
      });

      if (updateRes.count > 0) {
        await tx.product.update({
          where: { id: res.productId },
          data: {
            stock: { increment: res.quantity },
          },
        });
      }
    }
  }

  private async getOrderEntityById(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        reservations: true,
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  private assertOrderReadAccess(
    user: AuthenticatedUser,
    order: { userId: string; tenantId: string },
  ) {
    if (order.userId === user.id) {
      return;
    }

    if (user.platformRole === PlatformRole.SUPER_ADMIN) {
      return;
    }

    if (this.hasTenantStaffRole(user, order.tenantId)) {
      return;
    }

    throw new NotFoundException('Order not found');
  }

  private assertTenantStaff(user: AuthenticatedUser, tenantId: string) {
    if (user.platformRole === PlatformRole.SUPER_ADMIN) {
      return;
    }

    if (!this.hasTenantStaffRole(user, tenantId)) {
      throw new ForbiddenException('You do not have permission to manage orders for this store');
    }
  }

  private hasTenantStaffRole(user: AuthenticatedUser, tenantId: string): boolean {
    const membership = user.memberships?.find((m) => m.tenantId === tenantId);
    if (!membership) {
      return false;
    }

    const permittedRoles: TenantRole[] = [
      TenantRole.STORE_OWNER,
      TenantRole.STORE_MANAGER,
      TenantRole.STORE_STAFF,
    ];
    return permittedRoles.includes(membership.role);
  }

  private toMonetaryAmount(amount: number | Prisma.Decimal, currency = 'INR'): MonetaryAmount {
    const num = typeof amount === 'number' ? amount : Number(amount);
    const minorUnits = Math.round(num * 100);
    return {
      currency,
      amount: minorUnits / 100,
      minorUnits,
      formatted: `${currency} ${(minorUnits / 100).toFixed(2)}`,
    };
  }

  private mapOrderToResponse(order: any): OrderResponse {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      tenantId: order.tenantId,
      status: order.status,
      paymentStatus: order.paymentStatus,
      currency: order.currency,
      subtotal: this.toMonetaryAmount(order.subtotal, order.currency),
      taxAmount: this.toMonetaryAmount(order.taxAmount, order.currency),
      shippingAmount: this.toMonetaryAmount(order.shippingAmount, order.currency),
      totalAmount: this.toMonetaryAmount(order.totalAmount, order.currency),
      shippingAddress: order.shippingAddress,
      customerNote: order.customerNote,
      cancelReason: order.cancelReason,
      cancelledAt: order.cancelledAt,
      items: order.items.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        unitPrice: this.toMonetaryAmount(item.unitPrice, order.currency),
        quantity: item.quantity,
        subtotal: this.toMonetaryAmount(item.subtotal, order.currency),
        createdAt: item.createdAt,
      })),
      reservations: order.reservations?.map((res: any) => ({
        id: res.id,
        productId: res.productId,
        quantity: res.quantity,
        status: res.status,
        releasedAt: res.releasedAt,
        createdAt: res.createdAt,
      })),
      statusHistory: order.statusHistory?.map((h: any) => ({
        id: h.id,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        changedBy: h.changedBy,
        reason: h.reason,
        createdAt: h.createdAt,
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
