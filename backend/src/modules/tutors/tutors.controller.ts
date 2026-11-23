import type { Request, Response } from "express";
import { listTutorsSchema, tutorSchema } from "./tutors.schemas.js";
import { tutorsService } from "./tutors.service.js";

export const tutorsController = {
  async list(req: Request, res: Response) {
    res.json(await tutorsService.list(listTutorsSchema.parse(req.query)));
  },

  async get(req: Request<{ id: string }>, res: Response) {
    res.json(await tutorsService.get(req.params.id));
  },

  async create(req: Request, res: Response) {
    res.status(201).json(await tutorsService.create(tutorSchema.parse(req.body)));
  },

  async update(req: Request<{ id: string }>, res: Response) {
    res.json(await tutorsService.update(req.params.id, tutorSchema.parse(req.body)));
  },

  async remove(req: Request<{ id: string }>, res: Response) {
    await tutorsService.remove(req.params.id);
    res.status(204).end();
  },
};
