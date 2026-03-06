-- AlterTable: add new columns
ALTER TABLE "Product" ADD COLUMN "glbUrl" TEXT;
ALTER TABLE "Product" ADD COLUMN "usdzUrl" TEXT;

-- Migrate data from arUrl to new columns
-- Case 1: arUrl contains JSON like {"glb":"...","usdz":"..."}
UPDATE "Product"
SET "glbUrl" = ("arUrl"::jsonb)->>'glb',
    "usdzUrl" = ("arUrl"::jsonb)->>'usdz'
WHERE "arUrl" IS NOT NULL
  AND "arUrl" LIKE '{%';

-- Case 2: arUrl is a plain URL (not JSON)
UPDATE "Product"
SET "glbUrl" = "arUrl"
WHERE "arUrl" IS NOT NULL
  AND "arUrl" NOT LIKE '{%';
