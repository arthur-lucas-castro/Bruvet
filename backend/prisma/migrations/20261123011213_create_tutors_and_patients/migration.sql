-- CreateTable
CREATE TABLE "tutors" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "breed" TEXT,
    "sex" TEXT NOT NULL,
    "neutered" BOOLEAN NOT NULL DEFAULT false,
    "birthDate" DATETIME,
    "birthDateEstimated" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT,
    "microchip" TEXT,
    "weightKg" REAL,
    "allergies" TEXT,
    "chronicConditions" TEXT,
    "notes" TEXT,
    "deceasedAt" DATETIME,
    "searchText" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "patients_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

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
