import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.js";
import { tutorsController } from "./tutors.controller.js";

export const tutorsRoutes = Router();

// Toda a equipe consulta e cadastra tutores; excluir é restrito ao administrador
tutorsRoutes.use(authenticate());

tutorsRoutes.get("/", tutorsController.list);
tutorsRoutes.get("/:id", tutorsController.get);
tutorsRoutes.post("/", tutorsController.create);
tutorsRoutes.put("/:id", tutorsController.update);
tutorsRoutes.delete("/:id", authorize("admin"), tutorsController.remove);
