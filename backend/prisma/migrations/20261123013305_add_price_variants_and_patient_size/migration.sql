-- AlterTable
ALTER TABLE "patients" ADD COLUMN "size" TEXT;

-- CreateTable
CREATE TABLE "procedure_prices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "procedureId" TEXT NOT NULL,
    "species" TEXT,
    "size" TEXT,
    "priceCents" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "procedure_prices_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "procedures" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_procedure_price_changes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "procedureId" TEXT NOT NULL,
    "species" TEXT,
    "size" TEXT,
    "oldPriceCents" INTEGER,
    "newPriceCents" INTEGER,
    "changedById" TEXT NOT NULL,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "procedure_price_changes_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "procedures" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "procedure_price_changes_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_procedure_price_changes" ("changedAt", "changedById", "id", "newPriceCents", "oldPriceCents", "procedureId") SELECT "changedAt", "changedById", "id", "newPriceCents", "oldPriceCents", "procedureId" FROM "procedure_price_changes";
DROP TABLE "procedure_price_changes";
ALTER TABLE "new_procedure_price_changes" RENAME TO "procedure_price_changes";
CREATE INDEX "procedure_price_changes_procedureId_changedAt_idx" ON "procedure_price_changes"("procedureId", "changedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "procedure_prices_procedureId_species_size_key" ON "procedure_prices"("procedureId", "species", "size");
