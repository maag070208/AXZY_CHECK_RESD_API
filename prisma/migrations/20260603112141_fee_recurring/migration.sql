-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('ONE_TIME', 'MONTHLY');

-- AlterTable
ALTER TABLE "Fee" ADD COLUMN     "type" "FeeType" NOT NULL DEFAULT 'ONE_TIME';
