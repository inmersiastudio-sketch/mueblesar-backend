-- CreateIndex
--Create GIN index on product name and description for full-text search
CREATE INDEX "Product_name_description_search_idx" ON "Product" USING GIN (
  to_tsvector('spanish', COALESCE("name", '') || ' ' || COALESCE("description", ''))
);

-- CreateIndex  
-- Also index stores for search
CREATE INDEX "Store_name_description_search_idx" ON "Store" USING GIN (
  to_tsvector('spanish', COALESCE("name", '') || ' ' || COALESCE("description", ''))
);
