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

### Deploy automático pelo GitHub (`arthur-lucas-castro/Bruvet`)

| Push em | Resultado |
|---|---|
| `main` | Deploy de **produção** |
| `releases/*` | Deploy de **prévia** (site de prévia → API de prévia → banco de prévia) |
| qualquer outro branch | Nenhum deploy |

- A regra fica em `scripts/vercel-ignore-build.mjs` (em `backend/` e `frontend/`). Cada projeto
  também só republica quando a pasta dele mudou desde o último deploy daquele branch.
- Prévias do site vivem atrás do login da Vercel; o repasse `/api` da prévia usa o segredo
  `API_PROTECTION_BYPASS` (variável de Preview do `bruvet-web`) para chegar à prévia da API.

### Bancos (Neon, projeto `neon-byzantium-ferry`, São Paulo)

| Branch Neon | Usado por | Conteúdo |
|---|---|---|
| `main` | Produção | Dados reais (conectado pela integração da Vercel, só Production) |
| `preview` | Prévias (`releases/*`) | Criado só com o schema, sem dados de produção |

- A API usa `DATABASE_URL` (com pooler); as migrations usam `DATABASE_URL_UNPOOLED` (direta).
- Cada deploy da API roda `npm run build:vercel`: gera o Prisma Client, aplica as migrations
  pendentes (`scripts/vercel-migrate.mjs`) e compila. Migrations rodam sempre em produção e, em
  prévia, só com `PREVIEW_DB_ISOLATED=true` — garantia de que uma prévia nunca altera o banco
  de produção.
- O frontend gera o roteamento no build (`frontend/scripts/vercel-build.mjs`): em produção `/api`
  vai para `bruvet-api.vercel.app`; em prévia, para a prévia da API do mesmo branch.

### Variáveis em `bruvet-api`

| Variável | Production | Preview |
|---|---|---|
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | Neon `main` (integração) | Neon `preview` |
| `JWT_SECRET` | próprio | próprio (sessões não valem entre ambientes) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | admin real | admin de teste |
| `COOKIE_SECURE`, `NODE_ENV` | `true`, `production` | `true`, `production` |
| `PREVIEW_DB_ISOLATED` | — | `true` |

Deploy manual (raro; CLI da Vercel ≥ 47.2.2): `vercel deploy --prod` dentro de `backend/` ou
`frontend/`.

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
| `20261123033139_create_billing` | Comandas, itens avulsos, pagamentos e configurações; custo nos procedimentos e nas saídas de estoque; preço de venda nos medicamentos. Cria a comanda dos atendimentos existentes e o limite de desconto (10%) |

As migrations das etapas 1 a 6 foram escritas para SQLite e substituídas por esta base ao migrar
para PostgreSQL (o histórico delas continua no git). Novas mudanças de banco entram como novas
migrations a partir daqui.

### Comanda e financeiro

- **Comanda**: uma por atendimento, criada junto com ele. Total = procedimentos (preço gravado no
  lançamento) + medicamentos com preço de venda + itens avulsos − desconto. Situação recalculada a
  cada mudança: em aberto, paga ou cancelada (atendimento cancelado).
- **Cobrança (todos os perfis)**: pagamentos parciais em dinheiro, Pix, débito, crédito (parcelas)
  ou outro; quitação conjunta das comandas abertas do mesmo tutor. Estorno de pagamento só pelo
  admin (o registro fica, marcado como estornado).
- **Desconto**: todos os perfis, com motivo; veterinário e recepção até o limite configurado
  (padrão 10%), acima disso só o admin.
- **Custos**: custo do lote gravado em cada saída de estoque; custo direto opcional por
  procedimento (visível só ao admin); preço de venda dos medicamentos definido só pelo admin.
- **Financeiro (`/financeiro`, só admin)**: faturamento, custo direto, margem bruta, ticket médio,
  recebido, a receber, descontos, perdas e uso interno, receita × custo por dia/mês, quebras por
  categoria, procedimento, veterinário, espécie e forma de pagamento, valor em estoque. Avisa
  quando faltam custos cadastrados (margem incompleta).

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
