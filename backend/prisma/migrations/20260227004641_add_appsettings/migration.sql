-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "ai3dCredits" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "ai3dUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "subscriptionTier" TEXT DEFAULT 'FREE';

-- CreateTable
CREATE TABLE "CreditPurchase" (
    "id" SERIAL NOT NULL,
    "storeId" INTEGER NOT NULL,
    "credits" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "paymentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "CreditPurchase_storeId_idx" ON "CreditPurchase"("storeId");

-- CreateIndex
CREATE INDEX "CreditPurchase_paymentId_idx" ON "CreditPurchase"("paymentId");

-- AddForeignKey
ALTER TABLE "CreditPurchase" ADD CONSTRAINT "CreditPurchase_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
