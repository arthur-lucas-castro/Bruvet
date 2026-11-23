-- CreateTable
CREATE TABLE "patient_weights" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "weightKg" REAL NOT NULL,
    "source" TEXT NOT NULL,
    "attendanceId" TEXT,
    "recordedById" TEXT,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "patient_weights_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "patient_weights_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "attendances" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "patient_weights_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "patient_weights_attendanceId_key" ON "patient_weights"("attendanceId");

-- CreateIndex
CREATE INDEX "patient_weights_patientId_recordedAt_idx" ON "patient_weights"("patientId", "recordedAt");

-- Preenche o histórico com os pesos já existentes:
-- 1) pesos do exame físico de atendimentos finalizados
INSERT INTO "patient_weights" ("id", "patientId", "weightKg", "source", "attendanceId", "recordedById", "recordedAt")
SELECT 'pw' || lower(hex(randomblob(12))), "patientId", "weightKg", 'atendimento', "id", "veterinarianId",
       COALESCE("finishedAt", "startedAt")
FROM "attendances"
WHERE "status" = 'finalizado' AND "weightKg" IS NOT NULL;

-- 2) peso do cadastro, para pacientes que ainda não têm nenhuma pesagem
INSERT INTO "patient_weights" ("id", "patientId", "weightKg", "source", "recordedAt")
SELECT 'pw' || lower(hex(randomblob(12))), p."id", p."weightKg", 'cadastro', p."createdAt"
FROM "patients" p
WHERE p."weightKg" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "patient_weights" w WHERE w."patientId" = p."id");