import { Router, type Request, type Response } from "express";
import { authenticate, authorize, currentUser } from "../../middlewares/auth.js";
import {
  billItemSchema,
  discountSchema,
  listBillsSchema,
  payManySchema,
  paymentSchema,
  voidPaymentSchema,
} from "./billing.schemas.js";
import { billingService } from "./billing.service.js";

type IdRequest = Request<{ id: string }>;

// Todos os perfis consultam e cobram comandas. Estornar pagamento é só do admin;
// o limite de desconto por perfil é verificado no service.
export const billsRoutes = Router();
billsRoutes.use(authenticate());

billsRoutes.get("/", async (req, res) => {
  res.json(await billingService.list(listBillsSchema.parse(req.query)));
});
billsRoutes.get("/by-attendance/:id", async (req: IdRequest, res: Response) => {
  res.json(await billingService.getByAttendance(req.params.id));
});
billsRoutes.post("/pay-many", async (req, res) => {
  res.status(201).json(await billingService.payMany(payManySchema.parse(req.body), currentUser(req).id));
});
billsRoutes.get("/:id", async (req: IdRequest, res: Response) => {
  res.json(await billingService.get(req.params.id));
});
billsRoutes.post("/:id/items", async (req: IdRequest, res: Response) => {
  res.status(201).json(await billingService.addItem(req.params.id, billItemSchema.parse(req.body), currentUser(req).id));
});
billsRoutes.delete("/:id/items/:itemId", async (req: Request<{ id: string; itemId: string }>, res: Response) => {
  res.json(await billingService.removeItem(req.params.id, req.params.itemId));
});
billsRoutes.put("/:id/discount", async (req: IdRequest, res: Response) => {
  res.json(await billingService.setDiscount(req.params.id, discountSchema.parse(req.body), currentUser(req)));
});
billsRoutes.post("/:id/payments", async (req: IdRequest, res: Response) => {
  res.status(201).json(await billingService.pay(req.params.id, paymentSchema.parse(req.body), currentUser(req).id));
});

export const paymentsRoutes = Router();
paymentsRoutes.use(authenticate());
paymentsRoutes.post("/:id/void", authorize("admin"), async (req: IdRequest, res: Response) => {
  const { reason } = voidPaymentSchema.parse(req.body);
  res.json(await billingService.voidPayment(req.params.id, reason, currentUser(req).id));
});
