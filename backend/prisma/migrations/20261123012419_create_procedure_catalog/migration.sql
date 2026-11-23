-- CreateTable
CREATE TABLE "procedure_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "procedures" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "preparation" TEXT,
    "priceCents" INTEGER NOT NULL,
    "durationMinutes" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "searchText" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "procedures_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "procedure_categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "procedure_price_changes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "procedureId" TEXT NOT NULL,
    "oldPriceCents" INTEGER,
    "newPriceCents" INTEGER NOT NULL,
    "changedById" TEXT NOT NULL,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "procedure_price_changes_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "procedures" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "procedure_price_changes_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "procedure_categories_name_key" ON "procedure_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "procedures_code_key" ON "procedures"("code");

-- CreateIndex
CREATE INDEX "procedures_categoryId_idx" ON "procedures"("categoryId");

-- CreateIndex
CREATE INDEX "procedures_searchText_idx" ON "procedures"("searchText");

-- CreateIndex
CREATE INDEX "procedure_price_changes_procedureId_changedAt_idx" ON "procedure_price_changes"("procedureId", "changedAt");

-- Categorias iniciais do catálogo (podem ser renomeadas ou removidas pelo administrador).
-- Datas no mesmo formato ISO que o Prisma grava no SQLite.
INSERT INTO "procedure_categories" ("id", "name", "sortOrder", "createdAt", "updatedAt") VALUES
  ('cat_consultas',     'Consultas',                  10, strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now'), strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now')),
  ('cat_vacinas',       'Vacinas',                    20, strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now'), strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now')),
  ('cat_exames_lab',    'Exames laboratoriais',       30, strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now'), strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now')),
  ('cat_exames_imagem', 'Exames de imagem',           40, strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now'), strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now')),
  ('cat_ambulatorial',  'Procedimentos ambulatoriais', 50, strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now'), strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now')),
  ('cat_cirurgias',     'Cirurgias',                  60, strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now'), strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now')),
  ('cat_internacao',    'Internação',                 70, strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now'), strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now'));
