import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler.js";
import { routes } from "./routes/index.js";

export const app = express();

// Confia no proxy da rede interna (nginx no Docker) para obter o IP real do cliente
app.set("trust proxy", "loopback, uniquelocal");
app.disable("x-powered-by");

const allowedOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean);

app.use(
  cors(allowedOrigins.length > 0 ? { origin: allowedOrigins, credentials: true } : undefined),
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.use("/api", routes);

app.use(notFoundHandler);
app.use(errorHandler);
