import type { Request, Response } from "express";
import { currentUser } from "../../middlewares/auth.js";
import {
  addMedicationSchema,
  addProcedureSchema,
  cancelSchema,
  clinicalSchema,
  createAttendanceSchema,
  listAttendancesSchema,
  noteSchema,
  reverseSchema,
} from "./attendances.schemas.js";
import { attendancesService } from "./attendances.service.js";

type IdRequest = Request<{ id: string }>;
type ItemRequest = Request<{ id: string; itemId: string }>;

export const attendancesController = {
  async veterinarians(_req: Request, res: Response) {
    res.json(await attendancesService.veterinarians());
  },
  async list(req: Request, res: Response) {
    res.json(await attendancesService.list(listAttendancesSchema.parse(req.query)));
  },
  async get(req: IdRequest, res: Response) {
    res.json(await attendancesService.get(req.params.id));
  },
  async create(req: Request, res: Response) {
    const input = createAttendanceSchema.parse(req.body);
    res.status(201).json(await attendancesService.create(input, currentUser(req).id));
  },
  async updateClinical(req: IdRequest, res: Response) {
    res.json(await attendancesService.updateClinical(req.params.id, clinicalSchema.parse(req.body)));
  },
  async finish(req: IdRequest, res: Response) {
    res.json(await attendancesService.finish(req.params.id));
  },
  async cancel(req: IdRequest, res: Response) {
    const { reason } = cancelSchema.parse(req.body);
    res.json(await attendancesService.cancel(req.params.id, reason));
  },
  async reopen(req: IdRequest, res: Response) {
    res.json(await attendancesService.reopen(req.params.id));
  },
  async addNote(req: IdRequest, res: Response) {
    const { text } = noteSchema.parse(req.body);
    res.status(201).json(await attendancesService.addNote(req.params.id, text, currentUser(req).id));
  },
  async addProcedure(req: IdRequest, res: Response) {
    const input = addProcedureSchema.parse(req.body);
    res.status(201).json(await attendancesService.addProcedure(req.params.id, input, currentUser(req).id));
  },
  async removeProcedure(req: ItemRequest, res: Response) {
    await attendancesService.removeProcedure(req.params.id, req.params.itemId);
    res.status(204).end();
  },
  async addMedication(req: IdRequest, res: Response) {
    const input = addMedicationSchema.parse(req.body);
    res.status(201).json(await attendancesService.addMedication(req.params.id, input, currentUser(req).id));
  },
  async reverseMedication(req: ItemRequest, res: Response) {
    const { reason } = reverseSchema.parse(req.body ?? {});
    res
      .status(201)
      .json(
        await attendancesService.reverseMedication(req.params.id, req.params.itemId, currentUser(req).id, reason),
      );
  },
};
