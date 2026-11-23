-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "crmv" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cpf" TEXT,
    "phone" TEXT NOT NULL,
    "phoneAlt" TEXT,
    "email" TEXT,
    "zipCode" TEXT,
    "street" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "district" TEXT,
    "city" TEXT,
    "state" TEXT,
    "notes" TEXT,
    "searchText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tutors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "breed" TEXT,
    "sex" TEXT NOT NULL,
    "neutered" BOOLEAN NOT NULL DEFAULT false,
    "birthDate" TIMESTAMP(3),
    "birthDateEstimated" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT,
    "microchip" TEXT,
    "weightKg" DOUBLE PRECISION,
    "size" TEXT,
    "allergies" TEXT,
    "chronicConditions" TEXT,
    "notes" TEXT,
    "deceasedAt" TIMESTAMP(3),
    "searchText" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedure_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procedure_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedures" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "preparation" TEXT,
    "priceCents" INTEGER NOT NULL,
    "durationMinutes" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "searchText" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedure_prices" (
    "id" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "species" TEXT,
    "size" TEXT,
    "priceCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procedure_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedure_price_changes" (
    "id" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "species" TEXT,
    "size" TEXT,
    "oldPriceCents" INTEGER,
    "newPriceCents" INTEGER,
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procedure_price_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medications" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "activeIngredient" TEXT,
    "presentation" TEXT,
    "concentration" TEXT,
    "manufacturer" TEXT,
    "unit" TEXT NOT NULL,
    "minStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "controlled" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "searchText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_batches" (
    "id" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitCostCents" INTEGER,
    "supplier" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "medicationId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "patientId" TEXT,
    "attendanceId" TEXT,
    "reversalOfId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'aberto',
    "patientId" TEXT NOT NULL,
    "veterinarianId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "chiefComplaint" TEXT,
    "history" TEXT,
    "diet" TEXT,
    "vaccination" TEXT,
    "environment" TEXT,
    "currentMedications" TEXT,
    "weightKg" DOUBLE PRECISION,
    "temperatureC" DOUBLE PRECISION,
    "heartRate" INTEGER,
    "respiratoryRate" INTEGER,
    "capillaryRefillSec" DOUBLE PRECISION,
    "hydration" TEXT,
    "mucosa" TEXT,
    "bodyCondition" INTEGER,
    "physicalExam" TEXT,
    "diagnosis" TEXT,
    "treatmentPlan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_notes" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_procedures" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "species" TEXT,
    "size" TEXT,
    "notes" TEXT,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_weights" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "attendanceId" TEXT,
    "recordedById" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_weights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tutors_cpf_key" ON "tutors"("cpf");

-- CreateIndex
CREATE INDEX "tutors_searchText_idx" ON "tutors"("searchText");

-- CreateIndex
CREATE UNIQUE INDEX "patients_code_key" ON "patients"("code");

-- CreateIndex
CREATE UNIQUE INDEX "patients_microchip_key" ON "patients"("microchip");

-- CreateIndex
CREATE INDEX "patients_tutorId_idx" ON "patients"("tutorId");

-- CreateIndex
CREATE INDEX "patients_searchText_idx" ON "patients"("searchText");

-- CreateIndex
CREATE UNIQUE INDEX "procedure_categories_name_key" ON "procedure_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "procedures_code_key" ON "procedures"("code");

-- CreateIndex
CREATE INDEX "procedures_categoryId_idx" ON "procedures"("categoryId");

-- CreateIndex
CREATE INDEX "procedures_searchText_idx" ON "procedures"("searchText");

-- CreateIndex
CREATE UNIQUE INDEX "procedure_prices_procedureId_species_size_key" ON "procedure_prices"("procedureId", "species", "size");

-- CreateIndex
CREATE INDEX "procedure_price_changes_procedureId_changedAt_idx" ON "procedure_price_changes"("procedureId", "changedAt");

-- CreateIndex
CREATE INDEX "medications_searchText_idx" ON "medications"("searchText");

-- CreateIndex
CREATE INDEX "stock_batches_expiresAt_idx" ON "stock_batches"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "stock_batches_medicationId_batchNumber_key" ON "stock_batches"("medicationId", "batchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "stock_movements_reversalOfId_key" ON "stock_movements"("reversalOfId");

-- CreateIndex
CREATE INDEX "stock_movements_medicationId_createdAt_idx" ON "stock_movements"("medicationId", "createdAt");

-- CreateIndex
CREATE INDEX "stock_movements_patientId_idx" ON "stock_movements"("patientId");

-- CreateIndex
CREATE INDEX "stock_movements_attendanceId_idx" ON "stock_movements"("attendanceId");

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

-- CreateIndex
CREATE UNIQUE INDEX "patient_weights_attendanceId_key" ON "patient_weights"("attendanceId");

-- CreateIndex
CREATE INDEX "patient_weights_patientId_recordedAt_idx" ON "patient_weights"("patientId", "recordedAt");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "procedure_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_prices" ADD CONSTRAINT "procedure_prices_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "procedures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_price_changes" ADD CONSTRAINT "procedure_price_changes_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "procedures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_price_changes" ADD CONSTRAINT "procedure_price_changes_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "medications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "medications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "stock_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "attendances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "stock_movements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_veterinarianId_fkey" FOREIGN KEY ("veterinarianId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_notes" ADD CONSTRAINT "attendance_notes_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "attendances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_notes" ADD CONSTRAINT "attendance_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_procedures" ADD CONSTRAINT "attendance_procedures_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "attendances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_procedures" ADD CONSTRAINT "attendance_procedures_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "procedures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_procedures" ADD CONSTRAINT "attendance_procedures_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_weights" ADD CONSTRAINT "patient_weights_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_weights" ADD CONSTRAINT "patient_weights_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "attendances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_weights" ADD CONSTRAINT "patient_weights_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Categorias iniciais do catálogo (podem ser renomeadas ou removidas pelo administrador)
INSERT INTO "procedure_categories" ("id", "name", "sortOrder", "createdAt", "updatedAt") VALUES
  ('cat_consultas',     'Consultas',                   10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_vacinas',       'Vacinas',                     20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_exames_lab',    'Exames laboratoriais',        30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_exames_imagem', 'Exames de imagem',            40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_ambulatorial',  'Procedimentos ambulatoriais', 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_cirurgias',     'Cirurgias',                   60, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_internacao',    'Internação',                  70, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);