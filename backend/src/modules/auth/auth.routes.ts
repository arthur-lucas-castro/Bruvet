import { Router, type Request } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { env } from "../../config/env.js";
import { authenticate } from "../../middlewares/auth.js";
import { authController } from "./auth.controller.js";

export const authRoutes = Router();

/**
 * IP de quem tenta entrar. Na Vercel, o cabeçalho x-vercel-forwarded-for é preenchido
 * pela própria plataforma (o cliente não consegue forjá-lo).
 */
function clientIp(req: Request): string {
  // Fora da Vercel o cabeçalho poderia ser enviado pelo próprio cliente: ignora
  const vercelIp = env.VERCEL ? req.headers["x-vercel-forwarded-for"] : undefined;
  const ip = (Array.isArray(vercelIp) ? vercelIp[0] : vercelIp)?.split(",")[0]?.trim() || req.ip || "";
  return ipKeyGenerator(ip);
}

// Limita tentativas de login por IP para dificultar adivinhação de senha.
// Obs.: na Vercel o contador fica na memória de cada instância da função, então o limite
// é aproximado; para algo rígido, use um armazenamento compartilhado (ex.: Redis).
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: clientIp,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Muitas tentativas de login. Aguarde alguns minutos e tente novamente." },
});

const allowPending = authenticate({ allowPendingPasswordChange: true });

authRoutes.post("/login", loginLimiter, authController.login);
authRoutes.post("/logout", authController.logout);
authRoutes.get("/me", allowPending, authController.me);
authRoutes.post("/password", allowPending, authController.changePassword);
