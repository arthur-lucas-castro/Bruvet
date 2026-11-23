import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler.js";
import { routes } from "./routes/index.js";

export const app = express();

// IP real do cliente: na Vercel, um salto (o proxy dela); no Docker, o nginx da rede
// interna. Usado pelo limite de tentativas de login.
app.set("trust proxy", env.VERCEL ? 1 : "loopback, uniquelocal");
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
