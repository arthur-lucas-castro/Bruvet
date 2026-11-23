import { Router } from "express";
import { authenticate } from "../../middlewares/auth.js";
import { patientsController } from "./patients.controller.js";

export const patientsRoutes = Router();

// Toda a equipe consulta e cadastra pacientes. Não há exclusão: o prontuário é mantido,
// e o óbito é registrado no próprio cadastro.
patientsRoutes.use(authenticate());

patientsRoutes.get("/", patientsController.list);
patientsRoutes.get("/:id", patientsController.get);
patientsRoutes.get("/:id/history/summary", patientsController.historySummary);
patientsRoutes.get("/:id/history/events", patientsController.historyEvents);
patientsRoutes.post("/", patientsController.create);
patientsRoutes.put("/:id", patientsController.update);
