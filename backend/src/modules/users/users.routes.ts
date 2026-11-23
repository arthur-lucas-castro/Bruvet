import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.js";
import { usersController } from "./users.controller.js";

export const usersRoutes = Router();

// Gestão de usuários: somente administradores
usersRoutes.use(authenticate(), authorize("admin"));

usersRoutes.get("/", usersController.list);
usersRoutes.post("/", usersController.create);
usersRoutes.patch("/:id", usersController.update);
usersRoutes.post("/:id/reset-password", usersController.resetPassword);
