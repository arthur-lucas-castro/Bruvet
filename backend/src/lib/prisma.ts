import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "../config/env.js";

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  // Na Vercel cada instância da função atende poucas requisições por vez: conexões
  // demais esgotariam o limite do banco. O pooler do Neon cuida do resto.
  max: env.VERCEL ? 3 : 10,
});

export const prisma = new PrismaClient({ adapter });
