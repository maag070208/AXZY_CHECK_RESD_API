-- CreateTable
CREATE TABLE "ResidentFee" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "feeId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ResidentFee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResidentFee_residentId_feeId_deletedAt_key" ON "ResidentFee"("residentId", "feeId", "deletedAt");

-- AddForeignKey
ALTER TABLE "ResidentFee" ADD CONSTRAINT "ResidentFee_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentFee" ADD CONSTRAINT "ResidentFee_feeId_fkey" FOREIGN KEY ("feeId") REFERENCES "Fee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
