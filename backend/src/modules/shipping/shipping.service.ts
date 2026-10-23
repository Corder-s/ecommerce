import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OrderStatus,
  ReservationStatus,
  ShipmentStatus,
  PlatformRole,
  TenantRole,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { IShippingProvider, SHIPPING_PROVIDER_TOKEN } from '../../integrations/shipping-provider';
import { OutboxService } from '../outbox/outbox.service';
import { DomainEventType } from '../outbox/interfaces/outbox.interface';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';
import { ReadyOrdersQueryDto } from './dto/ready-orders-query.dto';
import {
  VALID_SHIPMENT_TRANSITIONS,
  ShipmentResponse,
  CustomerTrackingResponse,
  ReadyOrdersListResponse,
  MonetaryCost,
} from './interfaces/shipping.interface';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(SHIPPING_PROVIDER_TOKEN)
    private readonly shippingProvider: IShippingProvider,
    @Optional() private readonly outboxService?: OutboxService,
  ) {}

  /**
   * Retrieves orders awaiting fulfilment for a seller's store.
   * Eligible orders have status CONFIRMED or PROCESSING and are not cancelled.
   */
  async getReadyOrders(
    user: AuthenticatedUser,
    query: ReadyOrdersQueryDto,
    headerTenantId?: string,
  ): Promise<ReadyOrdersListResponse> {
    const targetTenantId = headerTenantId || query.tenantId;

    if (!targetTenantId) {
      throw new BadRequestException(
        'Tenant context is required. Please specify a tenantId via query or x-tenant-id header.',
      );
    }

    this.assertTenantStaff(user, targetTenantId);

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      tenantId: targetTenantId,
      status: {
        in: [OrderStatus.CONFIRMED, OrderStatus.PROCESSING],
      },
    };

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          items: true,
          shipments: true,
        },
      }),
    ]);

    const formattedOrders = orders.map((order) => {
      const totalNum = Number(order.totalAmount);

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        tenantId: order.tenantId,
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        totalAmount: {
          currency: order.currency,
          amount: totalNum,
          formatted: `${order.currency} ${totalNum.toFixed(2)}`,
        },
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
        shippingAddress: order.shippingAddress as Record<string, unknown>,
        shipmentsCount: order.shipments.length,
      };
    });

    return {
      orders: formattedOrders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Prepares and creates a shipment record for an eligible order.
   * Validates packaging parameters and carrier eligibility.
   */
  async createShipment(
    user: AuthenticatedUser,
    orderId: string,
    dto: CreateShipmentDto,
  ): Promise<ShipmentResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        shipments: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    this.assertTenantStaff(user, order.tenantId);

    // Validate whether the order can be shipped
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot create shipment for a cancelled order.');
    }

    if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.RETURNED) {
      throw new BadRequestException(
        `Order is already completed with status "${order.status}". No additional shipments can be dispatched.`,
      );
    }

    const shippableStatuses: OrderStatus[] = [
      OrderStatus.CONFIRMED,
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED, // Supports multi-package fulfilment for complex orders
    ];

    if (!shippableStatuses.includes(order.status)) {
      throw new BadRequestException(
        `Order with status "${order.status}" is not ready for shipment. Orders must be CONFIRMED or PROCESSING.`,
      );
    }

    // Parse recipient from snapshot shippingAddress
    const addr = order.shippingAddress as Record<string, any>;
    const recipient = {
      name: addr?.fullName || 'Customer',
      phone: addr?.phone || '',
      addressLine1: addr?.addressLine1 || '',
      addressLine2: addr?.addressLine2 || null,
      city: addr?.city || '',
      state: addr?.state || '',
      postalCode: addr?.postalCode || '',
      country: addr?.country || 'IN',
    };

    // Product & Carrier Eligibility Verification
    const itemNames = order.items.map((i) => i.productName);
    const carrierEligibility = this.shippingProvider.checkCarrierEligibility({
      packageWeight: dto.packageWeight,
      packageLength: dto.packageLength,
      packageWidth: dto.packageWidth,
      packageHeight: dto.packageHeight,
      carrierCode: dto.carrierCode,
      itemNames,
    });

    if (!carrierEligibility.isEligible) {
      throw new BadRequestException(
        `Carrier acceptance check failed: ${carrierEligibility.reason}`,
      );
    }

    // Call provider integration boundary to register shipment
    const providerResult = await this.shippingProvider.createShipment({
      orderId: order.id,
      orderNumber: order.orderNumber,
      tenantId: order.tenantId,
      recipient,
      packageWeight: dto.packageWeight,
      packageLength: dto.packageLength,
      packageWidth: dto.packageWidth,
      packageHeight: dto.packageHeight,
      carrierCode: dto.carrierCode,
      carrierNote: dto.carrierNote,
      items: order.items.map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
        sku: i.sku,
      })),
      customTrackingNumber: dto.trackingNumber,
    });

    const trackingNumber = dto.trackingNumber || providerResult.trackingNumber;
    const providerName =
      dto.provider || providerResult.provider || this.shippingProvider.providerName;
    const initialStatus =
      providerResult.initialStatus === 'READY_TO_SHIP'
        ? ShipmentStatus.READY_TO_SHIP
        : ShipmentStatus.PENDING;

    // Database transactional creation
    const createdShipment = await this.prisma.$transaction(async (tx) => {
      const shipment = await tx.shippingRecord.create({
        data: {
          tenantId: order.tenantId,
          orderId: order.id,
          provider: providerName,
          trackingNumber,
          status: initialStatus,
          packageWeight: new Prisma.Decimal(dto.packageWeight),
          packageLength: dto.packageLength ? new Prisma.Decimal(dto.packageLength) : null,
          packageWidth: dto.packageWidth ? new Prisma.Decimal(dto.packageWidth) : null,
          packageHeight: dto.packageHeight ? new Prisma.Decimal(dto.packageHeight) : null,
          shippingCost: dto.shippingCost
            ? new Prisma.Decimal(dto.shippingCost)
            : new Prisma.Decimal(0),
          currency: order.currency,
          carrierNote: dto.carrierNote || null,
        },
      });

      // Append initial shipment creation event
      await tx.shipmentEvent.create({
        data: {
          tenantId: order.tenantId,
          shippingRecordId: shipment.id,
          status: initialStatus,
          description: `Shipment created via ${providerName}. Package weight: ${dto.packageWeight}kg`,
          source: 'SELLER_PORTAL',
        },
      });

      // Advance order status from CONFIRMED to PROCESSING if initial shipment
      if (order.status === OrderStatus.CONFIRMED) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.PROCESSING },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: OrderStatus.CONFIRMED,
            toStatus: OrderStatus.PROCESSING,
            changedBy: user.id,
            reason: `Shipment preparation started (AWB: ${trackingNumber})`,
          },
        });
      }

      return shipment;
    });

    const refreshed = await this.prisma.shippingRecord.findUnique({
      where: { id: createdShipment.id },
      include: {
        events: {
          orderBy: { eventTimestamp: 'asc' },
        },
      },
    });

    this.logger.log(
      `Shipment created: ${createdShipment.id} for Order: ${order.orderNumber} with tracking: ${trackingNumber}`,
    );

    return this.mapShipmentToResponse(refreshed);
  }

  /**
   * Lists all shipments created for an order.
   * Accessible by store staff and the customer who placed the order.
   */
  async listOrderShipments(user: AuthenticatedUser, orderId: string): Promise<ShipmentResponse[]> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shipments: {
          include: {
            events: {
              orderBy: { eventTimestamp: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const isCustomerOwner = order.userId === user.id;
    const isStaff = this.hasTenantStaffRole(user, order.tenantId);
    const isSuperAdmin = user.platformRole === PlatformRole.SUPER_ADMIN;

    if (!isCustomerOwner && !isStaff && !isSuperAdmin) {
      throw new NotFoundException('Order not found');
    }

    return order.shipments.map((s) => this.mapShipmentToResponse(s));
  }

  /**
   * Retrieves single shipment details with full milestone history.
   */
  async getShipmentById(user: AuthenticatedUser, shipmentId: string): Promise<ShipmentResponse> {
    const shipment = await this.prisma.shippingRecord.findUnique({
      where: { id: shipmentId },
      include: {
        events: {
          orderBy: { eventTimestamp: 'asc' },
        },
      },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment record not found');
    }

    this.assertTenantStaff(user, shipment.tenantId);

    return this.mapShipmentToResponse(shipment);
  }

  /**
   * Updates shipment status following strict state machine rules.
   * Synchronises order lifecycle and inventory fulfillment status.
   */
  async updateShipmentStatus(
    user: AuthenticatedUser,
    shipmentId: string,
    dto: UpdateShipmentStatusDto,
  ): Promise<ShipmentResponse> {
    const shipment = await this.prisma.shippingRecord.findUnique({
      where: { id: shipmentId },
      include: {
        order: {
          include: {
            shipments: true,
          },
        },
      },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment record not found');
    }

    this.assertTenantStaff(user, shipment.tenantId);

    // Validate state machine transition
    const allowedTransitions = VALID_SHIPMENT_TRANSITIONS[shipment.status] || [];
    if (!allowedTransitions.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid status transition from "${shipment.status}" to "${dto.status}". Permitted transitions: ${
          allowedTransitions.join(', ') || 'None (terminal status)'
        }`,
      );
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      // 1. Update shipping record
      const updateData: Prisma.ShippingRecordUpdateInput = {
        status: dto.status,
        ...(dto.status === ShipmentStatus.SHIPPED && !shipment.shippedAt ? { shippedAt: now } : {}),
        ...(dto.status === ShipmentStatus.DELIVERED ? { deliveredAt: now } : {}),
      };

      await tx.shippingRecord.update({
        where: { id: shipmentId },
        data: updateData,
      });

      // 2. Add shipment milestone event
      await tx.shipmentEvent.create({
        data: {
          tenantId: shipment.tenantId,
          shippingRecordId: shipmentId,
          status: dto.status,
          description: dto.description || `Shipment transitioned to ${dto.status}`,
          location: dto.location || null,
          source: 'SELLER_MANUAL',
          eventTimestamp: now,
        },
      });

      // 3. Synchronise order status & inventory reservations
      const order = shipment.order;

      if (dto.status === ShipmentStatus.SHIPPED) {
        if (order.status !== OrderStatus.SHIPPED && order.status !== OrderStatus.DELIVERED) {
          await tx.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.SHIPPED },
          });

          await tx.inventoryReservation.updateMany({
            where: {
              orderId: order.id,
              status: ReservationStatus.RESERVED,
            },
            data: { status: ReservationStatus.FULFILLED },
          });

          await tx.orderStatusHistory.create({
            data: {
              orderId: order.id,
              fromStatus: order.status,
              toStatus: OrderStatus.SHIPPED,
              changedBy: user.id,
              reason: `Shipment ${shipment.trackingNumber || shipment.id} dispatched`,
            },
          });
        }

        if (this.outboxService) {
          await this.outboxService.createEvent(
            {
              eventType: DomainEventType.SHIPMENT_DISPATCHED,
              tenantId: shipment.tenantId,
              payload: {
                shipmentId: shipment.id,
                orderId: order.id,
                orderNumber: order.orderNumber,
                trackingNumber: shipment.trackingNumber,
                carrierName: shipment.provider,
                userId: order.userId,
              },
            },
            tx,
          );
        }
      } else if (dto.status === ShipmentStatus.DELIVERED) {
        // If all active shipments for this order are DELIVERED, advance order to DELIVERED
        const otherShipments = order.shipments.filter((s) => s.id !== shipment.id);
        const allDelivered = otherShipments.every(
          (s) => s.status === ShipmentStatus.DELIVERED || s.status === ShipmentStatus.CANCELLED,
        );

        if (allDelivered && order.status !== OrderStatus.DELIVERED) {
          await tx.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.DELIVERED },
          });

          await tx.orderStatusHistory.create({
            data: {
              orderId: order.id,
              fromStatus: order.status,
              toStatus: OrderStatus.DELIVERED,
              changedBy: user.id,
              reason: 'All shipments marked as delivered to customer',
            },
          });
        }

        if (this.outboxService) {
          await this.outboxService.createEvent(
            {
              eventType: DomainEventType.SHIPMENT_DELIVERED,
              tenantId: shipment.tenantId,
              payload: {
                shipmentId: shipment.id,
                orderId: order.id,
                orderNumber: order.orderNumber,
                userId: order.userId,
              },
            },
            tx,
          );
        }
      } else if (dto.status === ShipmentStatus.RETURN_TO_ORIGIN) {
        const otherShipments = order.shipments.filter((s) => s.id !== shipment.id);
        const allReturned = otherShipments.every(
          (s) =>
            s.status === ShipmentStatus.RETURN_TO_ORIGIN || s.status === ShipmentStatus.CANCELLED,
        );

        if (allReturned && order.status !== OrderStatus.RETURNED) {
          await tx.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.RETURNED },
          });

          await tx.orderStatusHistory.create({
            data: {
              orderId: order.id,
              fromStatus: order.status,
              toStatus: OrderStatus.RETURNED,
              changedBy: user.id,
              reason: 'Shipments returned to artisan seller origin',
            },
          });
        }
      }
    });

    const refreshed = await this.prisma.shippingRecord.findUnique({
      where: { id: shipmentId },
      include: {
        events: {
          orderBy: { eventTimestamp: 'asc' },
        },
      },
    });

    this.logger.log(
      `Shipment ${shipmentId} status updated from ${shipment.status} to ${dto.status} by user ${user.id}`,
    );

    return this.mapShipmentToResponse(refreshed);
  }

  /**
   * Dispatches a prepared shipment.
   * Advances status to SHIPPED and triggers inventory fulfilment.
   */
  async dispatchShipment(user: AuthenticatedUser, shipmentId: string): Promise<ShipmentResponse> {
    const shipment = await this.prisma.shippingRecord.findUnique({
      where: { id: shipmentId },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment record not found');
    }

    if (
      shipment.status !== ShipmentStatus.PENDING &&
      shipment.status !== ShipmentStatus.READY_TO_SHIP
    ) {
      throw new BadRequestException(
        `Cannot dispatch shipment with status "${shipment.status}". Only PENDING or READY_TO_SHIP shipments can be dispatched.`,
      );
    }

    return this.updateShipmentStatus(user, shipmentId, {
      status: ShipmentStatus.SHIPPED,
      description: 'Shipment handed over to courier carrier for transit',
    });
  }

  /**
   * Customer tracking view for their order.
   * Strictly enforces customer ownership (IDOR protection) and returns sanitized public tracking milestones.
   */
  async getCustomerOrderTracking(
    user: AuthenticatedUser,
    orderId: string,
  ): Promise<CustomerTrackingResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shipments: {
          include: {
            events: {
              orderBy: { eventTimestamp: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Customer ownership verification (IDOR protection)
    if (order.userId !== user.id && user.platformRole !== PlatformRole.SUPER_ADMIN) {
      throw new NotFoundException('Order not found');
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      currency: order.currency,
      shipments: order.shipments.map((s) => ({
        id: s.id,
        provider: s.provider,
        trackingNumber: s.trackingNumber,
        status: s.status,
        shippedAt: s.shippedAt,
        deliveredAt: s.deliveredAt,
        events: s.events.map((e) => ({
          status: e.status,
          description: e.description,
          location: e.location,
          eventTimestamp: e.eventTimestamp,
        })),
      })),
    };
  }

  /**
   * Ingests verified webhooks from external shipping carriers.
   * Enforces HMAC signature verification, deduplicates tracking events,
   * prevents out-of-order state regression, and synchronises order records.
   */
  async handleShippingWebhook(
    providerName: string,
    signatureHeader: string | undefined,
    rawBody: string | Buffer | Record<string, unknown>,
    body: Record<string, unknown>,
  ) {
    const webhookSecret =
      this.configService.get<string>('shipping.webhookSecret') || 'sandbox_shipping_webhook_secret';

    if (!signatureHeader) {
      throw new UnauthorizedException('Missing shipping provider webhook signature header');
    }

    const isValid = this.shippingProvider.verifyWebhookSignature(
      rawBody,
      signatureHeader,
      webhookSecret,
    );

    if (!isValid) {
      this.logger.warn(
        `Rejected invalid shipping webhook signature from provider: ${providerName}`,
      );
      throw new UnauthorizedException('Invalid cryptographic signature for shipping webhook');
    }

    const event = this.shippingProvider.parseWebhookEvent(body);
    const trackingNumber = event.trackingNumber;

    const shipment = await this.prisma.shippingRecord.findFirst({
      where: { trackingNumber },
      include: {
        order: {
          include: {
            shipments: true,
          },
        },
      },
    });

    if (!shipment) {
      this.logger.warn(
        `Received valid webhook for unknown tracking number: ${trackingNumber} from provider: ${providerName}`,
      );
      return { received: true, note: 'Shipment tracking number not found in platform database' };
    }

    const targetStatus = event.status as ShipmentStatus;

    // Idempotency / Deduplication check: Check if an identical event has already been recorded
    const existingDuplicateEvent = await this.prisma.shipmentEvent.findFirst({
      where: {
        shippingRecordId: shipment.id,
        status: targetStatus,
        description: event.description,
        eventTimestamp: event.eventTimestamp,
      },
    });

    if (existingDuplicateEvent) {
      this.logger.log(
        `Deduplicated duplicate tracking event for shipment ${shipment.id} (${trackingNumber})`,
      );
      return { received: true, deduplicated: true };
    }

    // Safety: Prevent out-of-order delivery regressions
    const isTerminal =
      shipment.status === ShipmentStatus.DELIVERED ||
      shipment.status === ShipmentStatus.RETURN_TO_ORIGIN ||
      shipment.status === ShipmentStatus.CANCELLED;

    await this.prisma.$transaction(async (tx) => {
      // Always record the chronological tracking history event
      await tx.shipmentEvent.create({
        data: {
          tenantId: shipment.tenantId,
          shippingRecordId: shipment.id,
          status: targetStatus,
          description: event.description,
          location: event.location || null,
          eventTimestamp: event.eventTimestamp,
          source: `${providerName.toUpperCase()}_WEBHOOK`,
        },
      });

      // Only advance status if current status is not already terminal
      if (!isTerminal) {
        const allowedTransitions = VALID_SHIPMENT_TRANSITIONS[shipment.status] || [];
        if (allowedTransitions.includes(targetStatus)) {
          const updateData: Prisma.ShippingRecordUpdateInput = {
            status: targetStatus,
            ...(targetStatus === ShipmentStatus.SHIPPED && !shipment.shippedAt
              ? { shippedAt: event.eventTimestamp }
              : {}),
            ...(targetStatus === ShipmentStatus.DELIVERED
              ? { deliveredAt: event.eventTimestamp }
              : {}),
          };

          await tx.shippingRecord.update({
            where: { id: shipment.id },
            data: updateData,
          });

          // Order status synchronization
          const order = shipment.order;
          if (targetStatus === ShipmentStatus.SHIPPED && order.status !== OrderStatus.SHIPPED) {
            await tx.order.update({
              where: { id: order.id },
              data: { status: OrderStatus.SHIPPED },
            });

            await tx.inventoryReservation.updateMany({
              where: { orderId: order.id, status: ReservationStatus.RESERVED },
              data: { status: ReservationStatus.FULFILLED },
            });

            await tx.orderStatusHistory.create({
              data: {
                orderId: order.id,
                fromStatus: order.status,
                toStatus: OrderStatus.SHIPPED,
                changedBy: 'SYSTEM_WEBHOOK',
                reason: `Shipment dispatched per carrier update (${trackingNumber})`,
              },
            });
          } else if (targetStatus === ShipmentStatus.DELIVERED) {
            const otherShipments = order.shipments.filter((s) => s.id !== shipment.id);
            const allDelivered = otherShipments.every(
              (s) => s.status === ShipmentStatus.DELIVERED || s.status === ShipmentStatus.CANCELLED,
            );

            if (allDelivered && order.status !== OrderStatus.DELIVERED) {
              await tx.order.update({
                where: { id: order.id },
                data: { status: OrderStatus.DELIVERED },
              });

              await tx.orderStatusHistory.create({
                data: {
                  orderId: order.id,
                  fromStatus: order.status,
                  toStatus: OrderStatus.DELIVERED,
                  changedBy: 'SYSTEM_WEBHOOK',
                  reason: `Package delivered per carrier confirmation (${trackingNumber})`,
                },
              });
            }
          }
        } else {
          this.logger.warn(
            `Ignoring invalid state change from ${shipment.status} to ${targetStatus} for tracking ${trackingNumber}`,
          );
        }
      }
    });

    return { received: true, processed: true };
  }

  // ---------------------------------------------------------------------------
  // Helper & Mapping Methods
  // ---------------------------------------------------------------------------

  private assertTenantStaff(user: AuthenticatedUser, tenantId: string): void {
    if (user.platformRole === PlatformRole.SUPER_ADMIN) {
      return;
    }

    if (!this.hasTenantStaffRole(user, tenantId)) {
      throw new ForbiddenException(
        `Access denied: You do not have permissions to manage shipping for tenant "${tenantId}".`,
      );
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

  private toMonetaryCost(amount: number | Prisma.Decimal, currency = 'INR'): MonetaryCost {
    const num = typeof amount === 'number' ? amount : Number(amount);
    return {
      currency,
      amount: num,
      formatted: `${currency} ${num.toFixed(2)}`,
    };
  }

  private mapShipmentToResponse(record: any): ShipmentResponse {
    return {
      id: record.id,
      tenantId: record.tenantId,
      orderId: record.orderId,
      provider: record.provider,
      trackingNumber: record.trackingNumber,
      status: record.status,
      packageWeight: Number(record.packageWeight),
      packageLength: record.packageLength ? Number(record.packageLength) : null,
      packageWidth: record.packageWidth ? Number(record.packageWidth) : null,
      packageHeight: record.packageHeight ? Number(record.packageHeight) : null,
      shippingCost: this.toMonetaryCost(record.shippingCost, record.currency),
      shippedAt: record.shippedAt,
      deliveredAt: record.deliveredAt,
      carrierNote: record.carrierNote,
      events: record.events?.map((e: any) => ({
        id: e.id,
        status: e.status,
        description: e.description,
        location: e.location,
        eventTimestamp: e.eventTimestamp,
        source: e.source,
        createdAt: e.createdAt,
      })),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
