-- CreateTable
CREATE TABLE "ProductLog" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductLog_productId_idx" ON "ProductLog"("productId");

-- CreateIndex
CREATE INDEX "ProductLog_userId_idx" ON "ProductLog"("userId");

-- AddForeignKey
ALTER TABLE "ProductLog" ADD CONSTRAINT "ProductLog_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
