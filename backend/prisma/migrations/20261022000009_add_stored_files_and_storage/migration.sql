-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('PENDING', 'UPLOADED', 'VERIFIED', 'ATTACHED', 'REJECTED', 'DELETED');

-- CreateEnum
CREATE TYPE "FilePurpose" AS ENUM ('PRODUCT_IMAGE', 'STORE_LOGO', 'STORE_BANNER', 'PRIVATE_DOCUMENT');

-- CreateEnum
CREATE TYPE "FileVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateTable
CREATE TABLE "stored_files" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "uploadedByUserId" TEXT NOT NULL,
    "purpose" "FilePurpose" NOT NULL,
    "objectKey" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "checksum" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "publicUrl" TEXT,
    "status" "FileStatus" NOT NULL DEFAULT 'PENDING',
    "visibility" "FileVisibility" NOT NULL DEFAULT 'PUBLIC',
    "errorMessage" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "attachedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stored_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stored_files_objectKey_key" ON "stored_files"("objectKey");

-- CreateIndex
CREATE INDEX "stored_files_tenantId_idx" ON "stored_files"("tenantId");

-- CreateIndex
CREATE INDEX "stored_files_uploadedByUserId_idx" ON "stored_files"("uploadedByUserId");

-- CreateIndex
CREATE INDEX "stored_files_status_idx" ON "stored_files"("status");

-- CreateIndex
CREATE INDEX "stored_files_purpose_idx" ON "stored_files"("purpose");

-- CreateIndex
CREATE INDEX "stored_files_createdAt_idx" ON "stored_files"("createdAt");

-- AddForeignKey
ALTER TABLE "stored_files" ADD CONSTRAINT "stored_files_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stored_files" ADD CONSTRAINT "stored_files_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
