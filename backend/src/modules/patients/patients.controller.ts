import type { Request, Response } from "express";
import { currentUser } from "../../middlewares/auth.js";
import { historyEventsSchema, patientHistoryService } from "./patient-history.service.js";
import { listPatientsSchema, patientSchema } from "./patients.schemas.js";
import { patientsService } from "./patients.service.js";

type IdRequest = Request<{ id: string }>;

export const patientsController = {
  async list(req: Request, res: Response) {
    res.json(await patientsService.list(listPatientsSchema.parse(req.query)));
  },

  async get(req: IdRequest, res: Response) {
    res.json(await patientsService.get(req.params.id));
  },

  async create(req: Request, res: Response) {
    res.status(201).json(await patientsService.create(patientSchema.parse(req.body), currentUser(req).id));
  },

  async update(req: IdRequest, res: Response) {
    res.json(await patientsService.update(req.params.id, patientSchema.parse(req.body), currentUser(req).id));
  },

  async historySummary(req: IdRequest, res: Response) {
    res.json(await patientHistoryService.summary(req.params.id));
  },

  async historyEvents(req: IdRequest, res: Response) {
    res.json(await patientHistoryService.events(req.params.id, historyEventsSchema.parse(req.query)));
  },
};
