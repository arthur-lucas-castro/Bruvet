-- CreateTable
CREATE TABLE "medications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "activeIngredient" TEXT,
    "presentation" TEXT,
    "concentration" TEXT,
    "manufacturer" TEXT,
    "unit" TEXT NOT NULL,
    "minStock" REAL NOT NULL DEFAULT 0,
    "controlled" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "searchText" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "stock_batches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "medicationId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "quantity" REAL NOT NULL,
    "unitCostCents" INTEGER,
    "supplier" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "stock_batches_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "medications" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "balanceAfter" REAL NOT NULL,
    "reason" TEXT,
    "medicationId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "patientId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_movements_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "medications" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "stock_movements_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "stock_batches" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "stock_movements_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "stock_movements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "medications_searchText_idx" ON "medications"("searchText");

-- CreateIndex
CREATE INDEX "stock_batches_expiresAt_idx" ON "stock_batches"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "stock_batches_medicationId_batchNumber_key" ON "stock_batches"("medicationId", "batchNumber");

-- CreateIndex
CREATE INDEX "stock_movements_medicationId_createdAt_idx" ON "stock_movements"("medicationId", "createdAt");

-- CreateIndex
CREATE INDEX "stock_movements_patientId_idx" ON "stock_movements"("patientId");
