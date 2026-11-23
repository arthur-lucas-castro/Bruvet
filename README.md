# Bruvet

Sistema de gestão para hospital veterinário.

| Pasta | Stack |
|---|---|
| [frontend/](frontend/) | React 19, Vite, TypeScript, Tailwind CSS 4, React Router, TanStack Query, ícones Lucide |
| [backend/](backend/) | Node 24, Express 5, TypeScript, Prisma 7 + PostgreSQL (adaptador `pg`), zod |
| [design-system/bruvet/MASTER.md](design-system/bruvet/MASTER.md) | Cores, fontes e regras visuais |

## Rodando com Docker

**Desenvolvimento** (recarrega ao salvar arquivos):

```bash
docker compose -f docker-compose.dev.yml up --build --watch
```

- Frontend: http://localhost:5173
- API: http://localhost:3333/api/health

**Produção** (frontend no nginx, API compilada):

```bash
docker compose up -d --build
```

- Sistema: http://localhost:8080

### Primeiro acesso

Quando o banco está vazio, o backend cria um administrador e exige a troca de senha no primeiro login.

| Ambiente | E-mail | Senha inicial |
|---|---|---|
| Desenvolvimento | `admin@bruvet.local` | `admin12345` |
| Produção | `ADMIN_EMAIL` (padrão `admin@bruvet.local`) | `ADMIN_PASSWORD`, ou uma senha aleatória exibida em `docker compose logs backend` |

Variáveis de produção que podem ser definidas num arquivo `.env` ao lado do `docker-compose.yml`:
`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `JWT_SECRET` (vazio = gerado e salvo no volume) e
`COOKIE_SECURE=true` quando o sistema estiver atrás de HTTPS.

### Perfis de acesso

| Perfil | Acesso |
|---|---|
| Administrador | Tudo, incluindo a gestão de usuários |
| Veterinário | Módulos clínicos (exige CRMV no cadastro) |
| Recepção | Módulos de atendimento ao público |

Os dois compose sobem um PostgreSQL próprio (serviço `db`), com os dados em volume Docker
(`bruvet-pg` em produção, `bruvet-dev-pg` em dev), então eles sobrevivem a `docker compose down`.
No dev, o Postgres fica exposto em `localhost:5432` (usuário/senha/banco `bruvet`). As migrations
são aplicadas ao subir o backend.

## Publicação na Vercel

| Projeto Vercel | Pasta | Endereço |
|---|---|---|
| `bruvet-web` | `frontend/` | https://bruvet-web.vercel.app — use este |
| `bruvet-api` | `backend/` | https://bruvet-api.vercel.app |

- O banco é um Postgres **Neon** conectado ao projeto `bruvet-api` pelo painel (Storage), que cria
  `DATABASE_URL` (com pooler, usada pela API) e `DATABASE_URL_UNPOOLED` (usada pelas migrations).
- `bruvet-web` repassa `/api/*` para `bruvet-api` (`frontend/vercel.json`): o navegador só fala com
  um domínio, e o cookie de sessão continua de primeira parte.
- Cada deploy da API roda `npm run vercel-build`: gera o Prisma Client, **aplica as migrations
  pendentes no Neon** e compila. A função fica em `backend/api/index.js` (região `gru1`, São Paulo).
- Variáveis de produção em `bruvet-api`: `JWT_SECRET` (obrigatória), `ADMIN_EMAIL`,
  `ADMIN_PASSWORD`, `COOKIE_SECURE=true`, `NODE_ENV=production`.

Para publicar uma nova versão (CLI da Vercel ≥ 47.2.2, já logada):

```bash
cd backend  && vercel deploy --prod   # API (aplica migrations novas)
cd frontend && vercel deploy --prod   # site
```

## Rodando sem Docker

Precisa de um Postgres acessível (ex.: `docker compose -f docker-compose.dev.yml up -d db`).

```bash
# backend
cd backend
cp .env.example .env
npm install
npm run dev          # http://localhost:3333

# frontend (outro terminal)
cd frontend
npm install
npm run dev          # http://localhost:5173 — /api é redirecionado para o backend
```

## Banco de dados

Toda alteração em `backend/prisma/schema.prisma` deve gerar uma migration, que é versionada em
`backend/prisma/migrations/` e aplicada automaticamente quando o container do backend sobe.

```bash
cd backend
npm run db:migrate -- --name descricao_da_mudanca   # cria e aplica a migration
npm run db:studio                                    # interface visual para ver os dados
```

| Migration | Conteúdo |
|---|---|
| `20261123023808_init` | Schema completo das etapas 1 a 6 em PostgreSQL (usuários, tutores, pacientes, catálogo com variações de preço, estoque, atendimentos e pesagens), com as categorias iniciais do catálogo |

As migrations das etapas 1 a 6 foram escritas para SQLite e substituídas por esta base ao migrar
para PostgreSQL (o histórico delas continua no git). Novas mudanças de banco entram como novas
migrations a partir daqui.

### Histórico do paciente

- `/pacientes/:id/historico`: curva de peso, vacinas aplicadas, medicamentos administrados e a
  linha do tempo (atendimentos com procedimentos, medicamentos e evolução; medicamentos dados fora
  de atendimento; pesagens; cadastro e óbito), com filtro por tipo e período e impressão.
- Pesagens entram pelo cadastro/edição do paciente e ao finalizar atendimentos com peso.
- Vacinas são os procedimentos de categorias cujo nome contém "vacina".
- Filtros de período usam o fuso do navegador (o dia inteiro do calendário local).

### Atendimentos

- Fluxo: aberto → finalizado (ou cancelado). Finalizar exige a queixa principal, trava a ficha e
  atualiza o peso do paciente; só o administrador reabre.
- Procedimentos lançados guardam nome e preço do momento (com a variação por espécie/porte), então
  reajustes no catálogo não alteram atendimentos antigos.
- Medicamentos lançados dão saída no estoque ligada ao paciente e ao atendimento; enquanto aberto,
  podem ser estornados (a quantidade volta ao mesmo lote).
- Anotações de evolução não são editadas; depois de finalizado, entram como adendo.
- A recepção abre e consulta; ficha clínica, evolução, procedimentos e medicamentos são do
  veterinário e do administrador.

### Estoque

- O saldo de um medicamento é a soma dos seus lotes; lotes vencidos não contam como disponível.
- Saídas sem lote escolhido usam primeiro o lote que vence antes (FEFO) e podem dividir entre lotes.
- Toda alteração de saldo gera uma movimentação (entrada, saída, ajuste ou perda) que nunca é
  editada nem apagada.
- Medicamentos controlados exigem paciente ou justificativa em cada saída.
- Alertas: abaixo do mínimo, lotes vencendo em 60 dias e lotes vencidos com saldo
  (`GET /api/stock/alerts`).
- Permissões: todos consultam; administrador e veterinário cadastram e movimentam; ajuste de
  inventário só o administrador.

### Ditado por voz

- Botão de microfone nos campos de texto da ficha clínica e da evolução do atendimento
  (`frontend/src/components/ui/DictationTextarea.tsx`). O texto entra na posição do cursor.
- Usa a Web Speech API do navegador em pt-BR: funciona no Chrome, Edge e Safari, não no Firefox.
- Exige contexto seguro: `localhost` ou **HTTPS**. Acessando pelo IP da rede em HTTP, o microfone
  fica indisponível.
- Comandos falados: "vírgula", "ponto final", "dois pontos", "ponto e vírgula", "interrogação",
  "nova linha", "parágrafo", "abre/fecha parênteses" (`frontend/src/lib/dictation/voice-commands.ts`).
- Privacidade: no Chrome o áudio é processado pelos servidores do Google; no Edge, pelos da
  Microsoft. Para manter o áudio dentro do hospital, troque o motor em
  `frontend/src/lib/dictation/use-dictation.ts` (a interface do hook foi pensada para isso).

### Preço por espécie e porte

Cada procedimento tem um valor padrão e pode ter variações por espécie e/ou porte. Para um
paciente vale a variação mais específica que combinar com ele: espécie + porte > só espécie >
só porte > valor padrão. A regra está em `backend/src/modules/procedures/pricing.ts` e pode ser
consultada em `GET /api/procedures/:id/price?patientId=...`.

## Etapas

0. ✅ Fundação: estrutura, banco, layout, Docker
1. ✅ Usuários e login
2. ✅ Tutores e pacientes
3. ✅ Catálogo de procedimentos
4. ✅ Estoque de medicamentos
5. ✅ Atendimento: anamnese e anotações
6. ✅ Histórico do paciente
7. ✅ Voz para texto
