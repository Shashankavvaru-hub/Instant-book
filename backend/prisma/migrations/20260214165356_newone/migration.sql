/*
  Warnings:

  - The values [LOCKED] on the enum `EventSeatStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to alter the column `totalAmount` on the `Booking` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - The primary key for the `BookingSeat` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `lockedAt` on the `EventSeat` table. All the data in the column will be lost.
  - You are about to drop the column `lockedBy` on the `EventSeat` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `Payment` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - Added the required column `expiresAt` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "EventSeatStatus_new" AS ENUM ('AVAILABLE', 'BOOKED');
ALTER TABLE "EventSeat" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "EventSeat" ALTER COLUMN "status" TYPE "EventSeatStatus_new" USING ("status"::text::"EventSeatStatus_new");
ALTER TYPE "EventSeatStatus" RENAME TO "EventSeatStatus_old";
ALTER TYPE "EventSeatStatus_new" RENAME TO "EventSeatStatus";
DROP TYPE "EventSeatStatus_old";
ALTER TABLE "EventSeat" ALTER COLUMN "status" SET DEFAULT 'AVAILABLE';
COMMIT;

-- DropForeignKey
ALTER TABLE "EventSeat" DROP CONSTRAINT "EventSeat_lockedBy_fkey";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "totalAmount" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "BookingSeat" DROP CONSTRAINT "BookingSeat_pkey",
ADD CONSTRAINT "BookingSeat_pkey" PRIMARY KEY ("eventSeatId");

-- AlterTable
ALTER TABLE "EventSeat" DROP COLUMN "lockedAt",
DROP COLUMN "lockedBy";

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "status" SET DEFAULT 'CREATED',
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2);

-- CreateIndex
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");

-- CreateIndex
CREATE INDEX "Booking_eventId_idx" ON "Booking"("eventId");

-- CreateIndex
CREATE INDEX "BookingSeat_bookingId_idx" ON "BookingSeat"("bookingId");

-- CreateIndex
CREATE INDEX "EventSeat_eventId_idx" ON "EventSeat"("eventId");

-- CreateIndex
CREATE INDEX "EventSeat_eventId_status_idx" ON "EventSeat"("eventId", "status");
