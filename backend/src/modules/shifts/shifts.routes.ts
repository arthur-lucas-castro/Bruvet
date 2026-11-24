import { Router, type Request, type Response } from "express";
import { authenticate, authorize, currentUser } from "../../middlewares/auth.js";
import {
  createShiftsSchema,
  listShiftsSchema,
  payShiftsSchema,
  periodSchema,
  ratesSchema,
  unpayShiftsSchema,
  updateShiftSchema,
} from "./shifts.schemas.js";
import { shiftsService } from "./shifts.service.js";

type IdRequest = Request<{ id: string }>;
const adminOnly = authorize("admin");

// Todos consultam a escala (valores só do admin ou do próprio profissional);
// montar a escala, definir valores e pagar plantões é só do admin.
export const shiftsRoutes = Router();
shiftsRoutes.use(authenticate());

shiftsRoutes.get("/", async (req, res) => {
  res.json(await shiftsService.list(listShiftsSchema.parse(req.query), currentUser(req)));
});
shiftsRoutes.get("/staff", async (req, res) => {
  res.json(await shiftsService.staff(currentUser(req)));
});
shiftsRoutes.get("/summary", async (req, res) => {
  res.json(await shiftsService.summary(periodSchema.parse(req.query), currentUser(req)));
});
shiftsRoutes.put("/rates/:id", adminOnly, async (req: IdRequest, res: Response) => {
  res.json(await shiftsService.setRates(req.params.id, ratesSchema.parse(req.body)));
});
shiftsRoutes.post("/pay", adminOnly, async (req, res) => {
  res.json(await shiftsService.pay(payShiftsSchema.parse(req.body), currentUser(req)));
});
shiftsRoutes.post("/unpay", adminOnly, async (req, res) => {
  res.json(await shiftsService.unpay(unpayShiftsSchema.parse(req.body)));
});
shiftsRoutes.post("/", adminOnly, async (req, res) => {
  res.status(201).json(await shiftsService.create(createShiftsSchema.parse(req.body), currentUser(req)));
});
shiftsRoutes.patch("/:id", adminOnly, async (req: IdRequest, res: Response) => {
  res.json(await shiftsService.update(req.params.id, updateShiftSchema.parse(req.body), currentUser(req)));
});
shiftsRoutes.delete("/:id", adminOnly, async (req: IdRequest, res: Response) => {
  await shiftsService.remove(req.params.id);
  res.status(204).end();
});
