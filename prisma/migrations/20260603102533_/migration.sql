/*
  Warnings:

  - A unique constraint covering the columns `[stripeCustomerId]` on the table `Resident` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "stripeInvoiceId" TEXT,
ADD COLUMN     "stripePaymentIntentId" TEXT;

-- AlterTable
ALTER TABLE "Resident" ADD COLUMN     "stripeCustomerId" TEXT;

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "interval" TEXT NOT NULL DEFAULT 'month',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResidentSubscription" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'incomplete',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ResidentSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_stripePriceId_key" ON "SubscriptionPlan"("stripePriceId");

-- CreateIndex
CREATE UNIQUE INDEX "ResidentSubscription_stripeSubscriptionId_key" ON "ResidentSubscription"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Resident_stripeCustomerId_key" ON "Resident"("stripeCustomerId");

-- AddForeignKey
ALTER TABLE "ResidentSubscription" ADD CONSTRAINT "ResidentSubscription_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentSubscription" ADD CONSTRAINT "ResidentSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
