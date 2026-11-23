import type { Request, Response } from "express";
import { currentUser } from "../../middlewares/auth.js";
import { createUserSchema, resetPasswordSchema, updateUserSchema } from "./users.schemas.js";
import { usersService } from "./users.service.js";

export const usersController = {
  async list(_req: Request, res: Response) {
    res.json(await usersService.list());
  },

  async create(req: Request, res: Response) {
    const input = createUserSchema.parse(req.body);
    res.status(201).json(await usersService.create(input));
  },

  async update(req: Request<{ id: string }>, res: Response) {
    const input = updateUserSchema.parse(req.body);
    res.json(await usersService.update(req.params.id, input, currentUser(req).id));
  },

  async resetPassword(req: Request<{ id: string }>, res: Response) {
    const { password } = resetPasswordSchema.parse(req.body);
    res.json(await usersService.resetPassword(req.params.id, password));
  },
};
