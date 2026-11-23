-- CreateTable
CREATE TABLE "attendances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'aberto',
    "patientId" TEXT NOT NULL,
    "veterinarianId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "cancelReason" TEXT,
    "chiefComplaint" TEXT,
    "history" TEXT,
    "diet" TEXT,
    "vaccination" TEXT,
    "environment" TEXT,
    "currentMedications" TEXT,
    "weightKg" REAL,
    "temperatureC" REAL,
    "heartRate" INTEGER,
    "respiratoryRate" INTEGER,
    "capillaryRefillSec" REAL,
    "hydration" TEXT,
    "mucosa" TEXT,
    "bodyCondition" INTEGER,
    "physicalExam" TEXT,
    "diagnosis" TEXT,
    "treatmentPlan" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "attendances_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "attendances_veterinarianId_fkey" FOREIGN KEY ("veterinarianId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "attendances_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "attendance_notes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attendanceId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attendance_notes_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "attendances" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "attendance_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "attendance_procedures" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attendanceId" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "species" TEXT,
    "size" TEXT,
    "notes" TEXT,
    "addedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attendance_procedures_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "attendances" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "attendance_procedures_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "procedures" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "attendance_procedures_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_stock_movements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "balanceAfter" REAL NOT NULL,
    "reason" TEXT,
    "medicationId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "patientId" TEXT,
    "attendanceId" TEXT,
    "reversalOfId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_movements_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "medications" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "stock_movements_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "stock_batches" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "stock_movements_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "stock_movements_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "attendances" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "stock_movements_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "stock_movements" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "stock_movements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_stock_movements" ("balanceAfter", "batchId", "createdAt", "id", "medicationId", "patientId", "quantity", "reason", "type", "userId") SELECT "balanceAfter", "batchId", "createdAt", "id", "medicationId", "patientId", "quantity", "reason", "type", "userId" FROM "stock_movements";
DROP TABLE "stock_movements";
ALTER TABLE "new_stock_movements" RENAME TO "stock_movements";
CREATE UNIQUE INDEX "stock_movements_reversalOfId_key" ON "stock_movements"("reversalOfId");
CREATE INDEX "stock_movements_medicationId_createdAt_idx" ON "stock_movements"("medicationId", "createdAt");
CREATE INDEX "stock_movements_patientId_idx" ON "stock_movements"("patientId");
CREATE INDEX "stock_movements_attendanceId_idx" ON "stock_movements"("attendanceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "attendances_code_key" ON "attendances"("code");

-- CreateIndex
CREATE INDEX "attendances_patientId_startedAt_idx" ON "attendances"("patientId", "startedAt");

-- CreateIndex
CREATE INDEX "attendances_status_startedAt_idx" ON "attendances"("status", "startedAt");

-- CreateIndex
CREATE INDEX "attendances_veterinarianId_idx" ON "attendances"("veterinarianId");

-- CreateIndex
CREATE INDEX "attendance_notes_attendanceId_createdAt_idx" ON "attendance_notes"("attendanceId", "createdAt");

-- CreateIndex
CREATE INDEX "attendance_procedures_attendanceId_idx" ON "attendance_procedures"("attendanceId");
