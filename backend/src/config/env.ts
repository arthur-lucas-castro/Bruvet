import "dotenv/config";
import { z } from "zod";

const booleanFromString = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3333),
  /** Conexão Postgres usada pela API (na Vercel/Neon, a URL com pooler). */
  DATABASE_URL: z.string().min(1).default("postgresql://bruvet:bruvet@localhost:5432/bruvet"),
  /** Pasta de dados persistentes (segredo das sessões gerado automaticamente). */
  DATA_DIR: z.string().min(1).default("./data"),
  /** Definida pela própria Vercel nas funções ("1"). */
  VERCEL: z.string().optional(),
  // Origens liberadas no CORS, separadas por vírgula. Vazio = libera todas (só em dev).
  CORS_ORIGIN: z.string().default(""),

  /** Segredo das sessões. Se vazio, é gerado e salvo em DATA_DIR/.jwt-secret. */
  JWT_SECRET: z.string().min(32, "JWT_SECRET precisa de pelo menos 32 caracteres").optional(),
  SESSION_HOURS: z.coerce.number().positive().default(12),
  /** true quando o sistema é servido por HTTPS. */
  COOKIE_SECURE: booleanFromString,

  // Administrador criado automaticamente quando o banco não tem nenhum usuário.
  ADMIN_NAME: z.string().min(1).default("Administrador"),
  ADMIN_EMAIL: z.email().default("admin@bruvet.local"),
  /** Se vazio, uma senha aleatória é gerada e exibida no log na primeira inicialização. */
  ADMIN_PASSWORD: z.string().min(8).optional(),
});

// Variáveis definidas como string vazia (ex.: "JWT_SECRET=" no .env) contam como ausentes.
const rawEnv = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value !== ""),
);

const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
  console.error("Variáveis de ambiente inválidas:", z.treeifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
