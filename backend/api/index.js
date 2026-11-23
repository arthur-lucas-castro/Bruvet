// Função da Vercel: todas as rotas (/api/...) chegam aqui pelo rewrite do vercel.json.
// Usa o código já compilado em dist/ pelo "vercel-build" (prisma generate + migrations + tsc).
import { app } from "../dist/app.js";
import { ensureAdmin } from "../dist/bootstrap/ensure-admin.js";

// Na primeira requisição de cada instância, garante o administrador inicial.
// Uma falha aqui (ex.: duas instâncias criando ao mesmo tempo) não pode derrubar a API.
const ready = ensureAdmin().catch((error) => {
  console.error("Falha ao verificar o administrador inicial:", error);
});

export default async function handler(req, res) {
  await ready;
  return app(req, res);
}
