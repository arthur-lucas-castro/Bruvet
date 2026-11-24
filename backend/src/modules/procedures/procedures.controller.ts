import type { Request, Response } from "express";
import { z } from "zod";
import { currentUser } from "../../middlewares/auth.js";
import { categoriesService } from "./categories.service.js";
import { categorySchema, listProceduresSchema, procedureSchema } from "./procedures.schemas.js";
import { proceduresService } from "./procedures.service.js";

type IdRequest = Request<{ id: string }>;

export const categoriesController = {
  async list(_req: Request, res: Response) {
    res.json(await categoriesService.list());
  },
  async create(req: Request, res: Response) {
    res.status(201).json(await categoriesService.create(categorySchema.parse(req.body)));
  },
  async update(req: IdRequest, res: Response) {
    res.json(await categoriesService.update(req.params.id, categorySchema.parse(req.body)));
  },
  async remove(req: IdRequest, res: Response) {
    await categoriesService.remove(req.params.id);
    res.status(204).end();
  },
};

/** O custo dos procedimentos é informação financeira: só o admin recebe. */
function hideCost<T extends { costCents?: number | null }>(req: Request, procedure: T): T {
  if (currentUser(req).role === "admin") return procedure;
  const { costCents: _costCents, ...rest } = procedure;
  return rest as T;
}

export const proceduresController = {
  async list(req: Request, res: Response) {
    const result = await proceduresService.list(listProceduresSchema.parse(req.query));
    res.json({ ...result, items: result.items.map((p) => hideCost(req, p)) });
  },
  async get(req: IdRequest, res: Response) {
    res.json(hideCost(req, await proceduresService.get(req.params.id)));
  },
  async price(req: IdRequest, res: Response) {
    const { patientId } = z.object({ patientId: z.string().min(1) }).parse(req.query);
    res.json(await proceduresService.priceForPatient(req.params.id, patientId));
  },
  async create(req: Request, res: Response) {
    const input = procedureSchema.parse(req.body);
    res.status(201).json(await proceduresService.create(input, currentUser(req).id));
  },
  async update(req: IdRequest, res: Response) {
    const input = procedureSchema.parse(req.body);
    res.json(await proceduresService.update(req.params.id, input, currentUser(req).id));
  },
};
