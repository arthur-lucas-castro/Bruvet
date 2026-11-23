// Aplica as migrations no build da Vercel:
// - produção: sempre;
// - prévias (outros branches e pull requests): só quando o banco delas é um branch
//   separado do Neon, sinalizado por PREVIEW_DB_ISOLATED=true nas variáveis de Preview.
//   Sem essa marcação, a prévia poderia estar apontando para o banco de produção, e
//   uma migration ainda em revisão o alteraria.
import { execSync } from "node:child_process";

const environment = process.env.VERCEL_ENV;
const previewIsolated = process.env.PREVIEW_DB_ISOLATED === "true";

if (environment === "production" || (environment === "preview" && previewIsolated)) {
  console.log(`Deploy "${environment}": aplicando migrations pendentes...`);
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
} else {
  console.log(
    `Deploy "${environment ?? "local"}": migrations NÃO aplicadas ` +
      "(só em produção ou em prévia com PREVIEW_DB_ISOLATED=true).",
  );
}
