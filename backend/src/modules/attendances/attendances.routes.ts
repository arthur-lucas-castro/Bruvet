import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.js";
import { attendancesController as c } from "./attendances.controller.js";

// Toda a equipe abre e consulta atendimentos (a recepção faz a chegada do paciente).
// A parte clínica — ficha, evolução, procedimentos e medicamentos — é do veterinário e do admin.
const clinical = authorize("admin", "veterinario");

export const attendancesRoutes = Router();
attendancesRoutes.use(authenticate());

attendancesRoutes.get("/veterinarians", c.veterinarians);
attendancesRoutes.get("/", c.list);
attendancesRoutes.get("/:id", c.get);
attendancesRoutes.post("/", c.create);

attendancesRoutes.put("/:id/clinical", clinical, c.updateClinical);
attendancesRoutes.post("/:id/finish", clinical, c.finish);
attendancesRoutes.post("/:id/cancel", clinical, c.cancel);
attendancesRoutes.post("/:id/reopen", authorize("admin"), c.reopen);

attendancesRoutes.post("/:id/notes", clinical, c.addNote);
attendancesRoutes.post("/:id/procedures", clinical, c.addProcedure);
attendancesRoutes.delete("/:id/procedures/:itemId", clinical, c.removeProcedure);
attendancesRoutes.post("/:id/medications", clinical, c.addMedication);
attendancesRoutes.post("/:id/medications/:itemId/reverse", clinical, c.reverseMedication);
