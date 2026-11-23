# Módulos

Cada funcionalidade fica em uma pasta própria, com a mesma divisão:

```
modules/pacientes/
  pacientes.routes.ts      # rotas Express do módulo
  pacientes.controller.ts  # lê a requisição, chama o service, responde
  pacientes.service.ts     # regras de negócio e acesso ao banco (Prisma)
  pacientes.schemas.ts     # validação de entrada com zod
```

Depois de criar o módulo, registre as rotas em `src/routes/index.ts`.
