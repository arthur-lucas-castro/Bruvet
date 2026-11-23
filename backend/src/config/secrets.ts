import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { env } from "./env.js";

/**
 * Segredo usado para assinar as sessões. Usa JWT_SECRET se definido; senão gera um
 * aleatório na primeira execução e o guarda na pasta de dados, para que as sessões
 * continuem válidas depois de reiniciar o servidor.
 */
function resolveJwtSecret(): string {
  if (env.JWT_SECRET) return env.JWT_SECRET;

  const file = join(env.DATA_DIR, ".jwt-secret");
  if (existsSync(file)) return readFileSync(file, "utf8").trim();

  mkdirSync(env.DATA_DIR, { recursive: true });
  const secret = randomBytes(48).toString("base64url");
  writeFileSync(file, secret, { mode: 0o600 });
  return secret;
}

export const jwtSecret = new TextEncoder().encode(resolveJwtSecret());
