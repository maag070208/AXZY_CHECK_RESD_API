-- CreateEnum
CREATE TYPE "AccessStatus" AS ENUM ('PENDING', 'ACTIVE', 'FINISHED', 'EXPIRED', 'REJECTED');

-- AlterTable
ALTER TABLE "Access" ADD COLUMN     "status" "AccessStatus" NOT NULL DEFAULT 'PENDING';
