// Build do frontend na Vercel (Build Output API v3).
// Gera o site e o roteamento de /api conforme o ambiente:
//   produção → API de produção (bruvet-api.vercel.app)
//   prévia   → prévia da API do MESMO branch (informada pela Vercel em
//              VERCEL_RELATED_PROJECTS; ver "relatedProjects" no vercel.json)
// Assim, uma prévia de releases/* nunca conversa com a API nem com o banco de produção.
import { execSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";

const PRODUCTION_API_HOST = "bruvet-api.vercel.app";
const API_PROJECT_NAME = "bruvet-api";

const environment = process.env.VERCEL_ENV ?? "development";

function apiHost() {
  if (environment === "production") return PRODUCTION_API_HOST;

  let related = [];
  try {
    related = JSON.parse(process.env.VERCEL_RELATED_PROJECTS ?? "[]");
  } catch {
    // segue para o erro abaixo
  }
  const api = related.find((p) => p?.project?.name === API_PROJECT_NAME);
  const host = api?.preview?.branch;
  if (!host) {
    // Melhor falhar do que publicar uma prévia apontando para a produção
    throw new Error(
      `Prévia sem o endereço da prévia de ${API_PROJECT_NAME}. Prévias só funcionam em ` +
        "deploys vindos do GitHub (branches releases/*), com o projeto da API relacionado.",
    );
  }
  return host;
}

const host = apiHost();

// Prévias da API ficam atrás da proteção da Vercel. Se houver um segredo de
// "Protection Bypass for Automation" da API, o proxy o envia (só servidor → servidor;
// o navegador nunca vê esta URL).
const bypass = environment !== "production" ? process.env.API_PROTECTION_BYPASS : undefined;
// Só o parâmetro do segredo: com "x-vercel-set-bypass-cookie" a Vercel responde com um
// redirecionamento (307) em vez de entregar a resposta da API.
const query = bypass ? `?x-vercel-protection-bypass=${encodeURIComponent(bypass)}` : "";

console.log(`Ambiente: ${environment} → /api aponta para https://${host}${bypass ? " (com bypass)" : ""}`);

execSync("npm run build", { stdio: "inherit" });

const output = ".vercel/output";
rmSync(output, { recursive: true, force: true });
mkdirSync(`${output}/static`, { recursive: true });
cpSync("dist", `${output}/static`, { recursive: true });

writeFileSync(
  `${output}/config.json`,
  JSON.stringify(
    {
      version: 3,
      routes: [
        // Arquivos com hash no nome: cache longo
        {
          src: "^/assets/(.*)$",
          headers: { "cache-control": "public, max-age=31536000, immutable" },
          continue: true,
        },
        // API: repassada ao backend do ambiente (mesmo domínio para o navegador → cookie de primeira parte)
        { src: "^/api/(.*)$", dest: `https://${host}/api/$1${query}` },
        { handle: "filesystem" },
        // SPA: rotas do React caem no index.html
        { src: "^/(.*)$", dest: "/index.html" },
      ],
    },
    null,
    2,
  ),
);

console.log(`Build Output gerado em ${output}`);
