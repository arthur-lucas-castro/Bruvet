-- AlterTable
ALTER TABLE "attendance_procedures" ADD COLUMN     "costCents" INTEGER;

-- AlterTable
ALTER TABLE "medications" ADD COLUMN     "salePriceCents" INTEGER;

-- AlterTable
ALTER TABLE "procedures" ADD COLUMN     "costCents" INTEGER;

-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN     "salePriceCents" INTEGER,
ADD COLUMN     "unitCostCents" INTEGER;

-- CreateTable
CREATE TABLE "bills" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'aberta',
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "discountReason" TEXT,
    "discountById" TEXT,
    "discountAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill_items" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPriceCents" INTEGER NOT NULL,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bill_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "installments" INTEGER,
    "notes" TEXT,
    "groupId" TEXT,
    "receivedById" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "voidedById" TEXT,
    "voidReason" TEXT,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "bills_attendanceId_key" ON "bills"("attendanceId");

-- CreateIndex
CREATE INDEX "bills_status_idx" ON "bills"("status");

-- CreateIndex
CREATE INDEX "bill_items_billId_idx" ON "bill_items"("billId");

-- CreateIndex
CREATE INDEX "payments_billId_idx" ON "payments"("billId");

-- CreateIndex
CREATE INDEX "payments_receivedAt_idx" ON "payments"("receivedAt");

-- CreateIndex
CREATE INDEX "payments_groupId_idx" ON "payments"("groupId");

-- CreateIndex
CREATE INDEX "stock_movements_type_createdAt_idx" ON "stock_movements"("type", "createdAt");

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "attendances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_discountById_fkey" FOREIGN KEY ("discountById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_items" ADD CONSTRAINT "bill_items_billId_fkey" FOREIGN KEY ("billId") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_items" ADD CONSTRAINT "bill_items_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_billId_fkey" FOREIGN KEY ("billId") REFERENCES "bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Comanda para cada atendimento que já existe (cancelados entram como comanda cancelada)
INSERT INTO "bills" ("id", "attendanceId", "status", "discountCents", "createdAt", "updatedAt")
SELECT 'bill_' || md5(random()::text || a."id"), a."id",
       CASE WHEN a."status" = 'cancelado' THEN 'cancelada' ELSE 'aberta' END,
       0, a."startedAt", CURRENT_TIMESTAMP
FROM "attendances" a;

-- Custo do lote nas movimentações já registradas (melhor estimativa disponível)
UPDATE "stock_movements" m
SET "unitCostCents" = b."unitCostCents"
FROM "stock_batches" b
WHERE m."batchId" = b."id" AND m."unitCostCents" IS NULL;

-- Limite de desconto (em %) para veterinários e recepção; acima disso, só o admin
INSERT INTO "settings" ("key", "value", "updatedAt") VALUES ('discount_limit_percent', '10', CURRENT_TIMESTAMP);