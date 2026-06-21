-- CreateEnum
CREATE TYPE "PinPriority" AS ENUM ('CRITICAL', 'URGENT', 'STANDARD');

-- AlterTable
ALTER TABLE "Pin" ADD COLUMN     "confirmations" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "priority" "PinPriority" NOT NULL DEFAULT 'STANDARD';

-- CreateIndex
CREATE INDEX "Pin_priority_status_idx" ON "Pin"("priority", "status");
