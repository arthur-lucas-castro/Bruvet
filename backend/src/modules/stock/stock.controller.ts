import type { Request, Response } from "express";
import { AppError } from "../../lib/app-error.js";
import { paginationSchema } from "../../lib/pagination.js";
import { currentUser } from "../../middlewares/auth.js";
import {
  adjustSchema,
  entrySchema,
  exitSchema,
  listMedicationsSchema,
  medicationSchema,
} from "./stock.schemas.js";
import { stockService } from "./stock.service.js";

type IdRequest = Request<{ id: string }>;

export const stockController = {
  async list(req: Request, res: Response) {
    res.json(await stockService.list(listMedicationsSchema.parse(req.query)));
  },
  async get(req: IdRequest, res: Response) {
    res.json(await stockService.get(req.params.id));
  },
  async create(req: Request, res: Response) {
    res.status(201).json(await stockService.create(medicationSchema.parse(req.body)));
  },
  async update(req: IdRequest, res: Response) {
    res.json(await stockService.update(req.params.id, medicationSchema.parse(req.body)));
  },
  async movements(req: IdRequest, res: Response) {
    res.json(await stockService.movements(req.params.id, paginationSchema.parse(req.query)));
  },
  async entry(req: IdRequest, res: Response) {
    const input = entrySchema.parse(req.body);
    res.status(201).json(await stockService.entry(req.params.id, input, currentUser(req).id));
  },
  async exit(req: IdRequest, res: Response) {
    const input = exitSchema.parse(req.body);
    res.status(201).json(await stockService.exit(req.params.id, input, currentUser(req).id));
  },
  async adjust(req: IdRequest, res: Response) {
    const input = adjustSchema.parse(req.body);
    const user = currentUser(req);
    // Corrigir o saldo pela contagem de inventário é exclusivo do administrador
    if (input.type === "ajuste" && user.role !== "admin") {
      throw new AppError("Somente administradores podem ajustar o inventário.", 403, "FORBIDDEN");
    }
    res.status(201).json(await stockService.adjust(req.params.id, input, user.id));
  },
  async alerts(_req: Request, res: Response) {
    res.json(await stockService.alerts());
  },
};
