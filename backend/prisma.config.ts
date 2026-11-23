import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Padrão igual ao de src/config/env.ts; permite rodar `prisma generate` sem .env (ex.: build Docker)
    url: process.env.DATABASE_URL ?? "file:./data/bruvet.db",
  },
});
