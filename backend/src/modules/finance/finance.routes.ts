import { Router } from "express";
import { authenticate, authorize, currentUser } from "../../middlewares/auth.js";
import { settingsSchema, settingsService } from "../settings/settings.service.js";
import { financeQuerySchema, financeService } from "./finance.service.js";

// Lucro, custo e indicadores para decisão: somente administradores
export const financeRoutes = Router();
financeRoutes.use(authenticate(), authorize("admin"));
financeRoutes.get("/summary", async (req, res) => {
  res.json(await financeService.summary(financeQuerySchema.parse(req.query)));
});

// Configurações: todos leem (ex.: limite de desconto exibido na comanda); só o admin altera
export const settingsRoutes = Router();
settingsRoutes.use(authenticate());
settingsRoutes.get("/", async (_req, res) => {
  res.json(await settingsService.all());
});
settingsRoutes.put("/", authorize("admin"), async (req, res) => {
  res.json(await settingsService.update(settingsSchema.parse(req.body), currentUser(req).id));
});
