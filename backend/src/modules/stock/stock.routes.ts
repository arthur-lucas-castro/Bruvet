import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.js";
import { stockController } from "./stock.controller.js";

// Toda a equipe consulta o estoque. Cadastro e movimentações: administrador e veterinário.
// O ajuste de inventário é restrito ao administrador (verificado no controller).
const canManage = authorize("admin", "veterinario");

export const medicationsRoutes = Router();
medicationsRoutes.use(authenticate());
medicationsRoutes.get("/", stockController.list);
medicationsRoutes.get("/:id", stockController.get);
medicationsRoutes.get("/:id/movements", stockController.movements);
medicationsRoutes.post("/", canManage, stockController.create);
medicationsRoutes.put("/:id", canManage, stockController.update);
medicationsRoutes.post("/:id/entries", canManage, stockController.entry);
medicationsRoutes.post("/:id/exits", canManage, stockController.exit);

export const stockRoutes = Router();
stockRoutes.use(authenticate());
stockRoutes.get("/alerts", stockController.alerts);
stockRoutes.post("/batches/:id/adjust", canManage, stockController.adjust);
