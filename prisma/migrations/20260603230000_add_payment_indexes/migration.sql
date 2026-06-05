-- CreateIndex
CREATE INDEX IF NOT EXISTS "Payment_residentId_status_idx" ON "Payment" ("residentId", "status");
CREATE INDEX IF NOT EXISTS "Payment_feeId_idx" ON "Payment" ("feeId");
CREATE INDEX IF NOT EXISTS "Payment_period_idx" ON "Payment" ("period");
CREATE INDEX IF NOT EXISTS "Payment_deletedAt_idx" ON "Payment" ("deletedAt");
CREATE INDEX IF NOT EXISTS "Payment_status_period_deletedAt_idx" ON "Payment" ("status", "period", "deletedAt");

-- PaymentLog indexes
CREATE INDEX IF NOT EXISTS "PaymentLog_paymentId_idx" ON "PaymentLog" ("paymentId");
CREATE INDEX IF NOT EXISTS "PaymentLog_residentId_idx" ON "PaymentLog" ("residentId");
