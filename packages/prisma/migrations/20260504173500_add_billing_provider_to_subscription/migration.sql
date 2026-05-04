-- CreateEnum
CREATE TYPE "BillingProvider" AS ENUM ('STRIPE', 'PADDLE');

-- AlterTable
ALTER TABLE "Subscription"
ADD COLUMN "provider" "BillingProvider" NOT NULL DEFAULT 'PADDLE';
