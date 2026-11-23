import { app } from "./app.js";
import { ensureAdmin } from "./bootstrap/ensure-admin.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";

await ensureAdmin();

const server = app.listen(env.PORT, () => {
  console.log(`API Bruvet rodando em http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

function shutdown(signal: string) {
  console.log(`${signal} recebido, encerrando...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
