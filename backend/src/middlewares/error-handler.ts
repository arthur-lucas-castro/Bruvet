import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError, z } from "zod";
import { Prisma } from "../generated/prisma/client.js";
import { AppError } from "../lib/app-error.js";

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ message: `Rota não encontrada: ${req.method} ${req.path}` });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message, code: err.code });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({ message: "Dados inválidos", issues: z.flattenError(err).fieldErrors });
    return;
  }

  // Violação de campo único que escapou das verificações dos services (ex.: cadastro simultâneo)
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    res.status(409).json({ message: "Já existe um registro com estes dados", code: "DUPLICATE" });
    return;
  }

  console.error(err);
  res.status(500).json({ message: "Erro interno do servidor" });
};
