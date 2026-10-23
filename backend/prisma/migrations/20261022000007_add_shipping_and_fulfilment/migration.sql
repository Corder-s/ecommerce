-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING', 'READY_TO_SHIP', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_FAILED', 'RETURN_TO_ORIGIN', 'CANCELLED');

-- CreateTable
CREATE TABLE "shipping_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'sandbox',
    "trackingNumber" TEXT,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
    "packageWeight" DECIMAL(10,2) NOT NULL,
    "packageLength" DECIMAL(10,2),
    "packageWidth" DECIMAL(10,2),
    "packageHeight" DECIMAL(10,2),
    "shippingCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "carrierNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shippingRecordId" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT,
    "eventTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'CARRIER_WEBHOOK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shipping_records_tenantId_idx" ON "shipping_records"("tenantId");

-- CreateIndex
CREATE INDEX "shipping_records_orderId_idx" ON "shipping_records"("orderId");

-- CreateIndex
CREATE INDEX "shipping_records_trackingNumber_idx" ON "shipping_records"("trackingNumber");

-- CreateIndex
CREATE INDEX "shipping_records_status_idx" ON "shipping_records"("status");

-- CreateIndex
CREATE INDEX "shipment_events_shippingRecordId_idx" ON "shipment_events"("shippingRecordId");

-- CreateIndex
CREATE INDEX "shipment_events_tenantId_idx" ON "shipment_events"("tenantId");

-- CreateIndex
CREATE INDEX "shipment_events_eventTimestamp_idx" ON "shipment_events"("eventTimestamp");

-- AddForeignKey
ALTER TABLE "shipping_records" ADD CONSTRAINT "shipping_records_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_records" ADD CONSTRAINT "shipping_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_shippingRecordId_fkey" FOREIGN KEY ("shippingRecordId") REFERENCES "shipping_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
