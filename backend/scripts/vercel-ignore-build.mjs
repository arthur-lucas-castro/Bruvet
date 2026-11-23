// "Ignored Build Step" da Vercel: decide se um commit vindo do GitHub gera deploy.
// Saída 1 = construir; saída 0 = ignorar.
//   main        → deploy de produção
//   releases/*  → deploy de prévia
//   outros      → sem deploy
// Também ignora quando esta pasta não mudou desde o último deploy do branch.
// (Mesmo script em backend/ e frontend/: a Vercel roda cada um dentro da pasta raiz do projeto.)
import { execSync } from "node:child_process";

const branch = process.env.VERCEL_GIT_COMMIT_REF ?? "";
const previousSha = process.env.VERCEL_GIT_PREVIOUS_SHA;
const build = (reason) => {
  console.log(`✅ Construir: ${reason}`);
  process.exit(1);
};
const skip = (reason) => {
  console.log(`⏭️  Ignorar: ${reason}`);
  process.exit(0);
};

const isProduction = branch === "main";
const isRelease = branch.startsWith("releases/");
if (!isProduction && !isRelease) skip(`branch "${branch}" não publica (só main e releases/*).`);

const target = isProduction ? "produção" : "prévia";

// Sem deploy anterior do branch, sempre constrói (ex.: primeiro push de um releases/*)
if (!previousSha) build(`primeiro deploy de ${target} do branch "${branch}".`);

try {
  // Diferença entre o último commit publicado e o atual, só nesta pasta (".")
  execSync(`git diff --quiet ${previousSha} HEAD -- .`, { stdio: "ignore" });
  skip(`nada mudou nesta pasta desde o último deploy de ${target} (${previousSha.slice(0, 7)}).`);
} catch (error) {
  // status 1 = há mudanças; outro erro (ex.: commit anterior fora do clone raso) = construir por segurança
  build(
    error.status === 1
      ? `mudanças nesta pasta → deploy de ${target} (${branch}).`
      : `não foi possível comparar com o último deploy → deploy de ${target} por segurança.`,
  );
}
