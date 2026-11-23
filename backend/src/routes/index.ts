import { Router } from "express";
import { attendancesRoutes } from "../modules/attendances/attendances.routes.js";
import { authRoutes } from "../modules/auth/auth.routes.js";
import { patientsRoutes } from "../modules/patients/patients.routes.js";
import {
  procedureCategoriesRoutes,
  proceduresRoutes,
} from "../modules/procedures/procedures.routes.js";
import { medicationsRoutes, stockRoutes } from "../modules/stock/stock.routes.js";
import { tutorsRoutes } from "../modules/tutors/tutors.routes.js";
import { usersRoutes } from "../modules/users/users.routes.js";
import { healthRoutes } from "./health.routes.js";

// Registre aqui as rotas de cada módulo.
export const routes = Router();

routes.use("/health", healthRoutes);
routes.use("/auth", authRoutes);
routes.use("/users", usersRoutes);
routes.use("/tutors", tutorsRoutes);
routes.use("/patients", patientsRoutes);
routes.use("/procedure-categories", procedureCategoriesRoutes);
routes.use("/procedures", proceduresRoutes);
routes.use("/medications", medicationsRoutes);
routes.use("/stock", stockRoutes);
routes.use("/attendances", attendancesRoutes);
