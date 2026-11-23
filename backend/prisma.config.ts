import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations usam a conexão direta (sem pooler) quando existe — o Neon fornece as duas.
    // O padrão permite rodar `prisma generate` sem .env (ex.: build Docker).
    url:
      process.env.DATABASE_URL_UNPOOLED ??
      process.env.DATABASE_URL ??
      "postgresql://bruvet:bruvet@localhost:5432/bruvet",
  },
});
