-- Suppliers master table

CREATE TABLE IF NOT EXISTS "Supplier" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "contact" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Supplier_name_idx" ON "Supplier"("name");

