-- CreateEnum
CREATE TYPE "PinType" AS ENUM ('OFFER', 'NEED');

-- CreateEnum
CREATE TYPE "PinStatus" AS ENUM ('OPEN', 'CLAIMED', 'RESOLVED');

-- CreateTable
CREATE TABLE "Pin" (
    "id" TEXT NOT NULL,
    "type" "PinType" NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "status" "PinStatus" NOT NULL DEFAULT 'OPEN',
    "contact" TEXT,
    "ownerToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pin_status_expiresAt_idx" ON "Pin"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "Pin_lat_lng_idx" ON "Pin"("lat", "lng");
