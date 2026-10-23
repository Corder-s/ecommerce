-- CreateIndex
CREATE INDEX "products_tenantId_status_createdAt_idx" ON "products"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "products_tenantId_categoryId_status_idx" ON "products"("tenantId", "categoryId", "status");

-- CreateIndex
CREATE INDEX "orders_tenantId_createdAt_idx" ON "orders"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "orders_userId_createdAt_idx" ON "orders"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "orders_tenantId_status_createdAt_idx" ON "orders"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "payment_records_tenantId_status_idx" ON "payment_records"("tenantId", "status");

-- CreateIndex
CREATE INDEX "payment_records_createdAt_status_idx" ON "payment_records"("createdAt", "status");

-- CreateIndex
CREATE INDEX "refund_records_tenantId_status_idx" ON "refund_records"("tenantId", "status");

-- CreateIndex
CREATE INDEX "refund_records_createdAt_status_idx" ON "refund_records"("createdAt", "status");
