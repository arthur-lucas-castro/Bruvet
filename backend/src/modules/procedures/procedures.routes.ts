import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.js";
import { categoriesController, proceduresController } from "./procedures.controller.js";

// Toda a equipe consulta o catálogo; só o administrador altera itens e preços.
const adminOnly = authorize("admin");

export const procedureCategoriesRoutes = Router();
procedureCategoriesRoutes.use(authenticate());
procedureCategoriesRoutes.get("/", categoriesController.list);
procedureCategoriesRoutes.post("/", adminOnly, categoriesController.create);
procedureCategoriesRoutes.put("/:id", adminOnly, categoriesController.update);
procedureCategoriesRoutes.delete("/:id", adminOnly, categoriesController.remove);

// Não há exclusão de procedimento: desative-o (active: false) para preservar o histórico.
export const proceduresRoutes = Router();
proceduresRoutes.use(authenticate());
proceduresRoutes.get("/", proceduresController.list);
proceduresRoutes.get("/:id", proceduresController.get);
proceduresRoutes.get("/:id/price", proceduresController.price);
proceduresRoutes.post("/", adminOnly, proceduresController.create);
proceduresRoutes.put("/:id", adminOnly, proceduresController.update);
