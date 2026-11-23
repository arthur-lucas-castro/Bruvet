import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { authenticate } from "../../middlewares/auth.js";
import { authController } from "./auth.controller.js";

export const authRoutes = Router();

// Limita tentativas de login por IP para dificultar adivinhação de senha
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
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
