import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import productsRouter from "./routes/products.js";
import storesRouter from "./routes/stores.js";
import openapiRouter from "./routes/openapi.js";
import arRouter from "./routes/ar.js";
import adminProductsRouter from "./routes/adminProducts.js";
import authRouter from "./routes/auth.js";
import adminStatsRouter from "./routes/adminStats.js";
import eventsRouter from "./routes/events.js";
import uploadRouter from "./routes/upload.js";
import ai3dRouter from "./routes/ai3d.js";
import proxyRouter from "./routes/proxy.js";
import arRedirectRouter from "./routes/arRedirect.js";
import { rateLimit } from "./middleware/rateLimit.js";

export function createServer() {
  const app = express();

  // Necesario para que cookies Secure funcionen detrás de proxy/ingress
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use(pinoHttp());

  // Rate limiting general para evitar abusos básicos
  const publicLimiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
  const eventsLimiter = rateLimit({ windowMs: 60 * 1000, max: 60 });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use(publicLimiter);

  app.use("/api/products", productsRouter);
  app.use("/api/stores", storesRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/admin/products", adminProductsRouter);
  app.use("/api/admin/stats", adminStatsRouter);
  app.use("/api/admin/ai-3d", ai3dRouter);
  app.use("/api/upload", uploadRouter);
  app.use("/api/proxy", proxyRouter);
  app.use("/api/short/ar", arRedirectRouter);
  app.use("/api/events", eventsLimiter, eventsRouter);
  app.use("/api/ar", arRouter);
  app.use(openapiRouter);

  app.use((req, res) => {
    res.status(404).json({ error: "Not found", path: req.path });
  });

  return app;
}
