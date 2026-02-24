-- CreateEnum
CREATE TYPE "ArSource" AS ENUM ('WEB', 'IOS', 'ANDROID', 'UNKNOWN');

-- CreateTable
CREATE TABLE "ArView" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "storeId" INTEGER,
    "source" "ArSource" NOT NULL DEFAULT 'UNKNOWN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArView_productId_idx" ON "ArView"("productId");

-- CreateIndex
CREATE INDEX "ArView_storeId_idx" ON "ArView"("storeId");

-- CreateIndex
CREATE INDEX "ArView_createdAt_idx" ON "ArView"("createdAt");

-- AddForeignKey
ALTER TABLE "ArView" ADD CONSTRAINT "ArView_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArView" ADD CONSTRAINT "ArView_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
