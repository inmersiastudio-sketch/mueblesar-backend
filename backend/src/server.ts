import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import pino from "pino";
import cookieParser from "cookie-parser";
import productsRouter from "./routes/products.js";
import storesRouter from "./routes/stores.js";
import openapiRouter from "./routes/openapi.js";
import arRouter from "./routes/ar.js";
import adminProductsRouter from "./routes/adminProducts.js";
import authRouter from "./routes/auth.js";
import adminStatsRouter from "./routes/adminStats.js";
import adminSettingsRouter from "./routes/adminSettings.js";
import eventsRouter from "./routes/events.js";
import uploadRouter from "./routes/upload.js";
import ai3dRouter from "./routes/ai3d.js";
import proxyRouter from "./routes/proxy.js";
import arRedirectRouter from "./routes/arRedirect.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { redis } from "./lib/redis.js";

export function createServer() {
  const app = express();

  // ensure Redis connection info visible early
  if (redis) {
    console.log("Redis client configured");
  } else {
    console.warn("Redis not configured; rate limiting will be per-process");
  }

  // Necesario para que cookies Secure funcionen detrás de proxy/ingress
  app.set("trust proxy", 1);

  app.use(helmet());

  // CORS estricto basado en variable de entorno
  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')
    : ["http://localhost:3000"];

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());
  // Pretty logs en desarrollo, JSON en producción
  const isDev = process.env.NODE_ENV !== "production";
  const logger = isDev
    ? pino({ transport: { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss" } } })
    : pino();
  app.use((pinoHttp as any)({ logger }));

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
  app.use("/api/admin/settings", adminSettingsRouter);
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

  // Manejador Global de Errores (debe ir al final de todos los routes/middlewares)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Si se está usando pino-http, loguear el error con contexto
    if (req.log) {
      req.log.error({ err }, "Unhandled application error");
    } else {
      console.error("Unhandled application error", err);
    }

    // Si la respuesta ya fue enviada fallar silenciosamente
    if (res.headersSent) {
      return next(err);
    }

    const statusCode = err.status || err.statusCode || 500;
    const isDev = process.env.NODE_ENV !== "production";

    res.status(statusCode).json({
      error: "Internal Server Error",
      message: isDev ? err.message : "Algo salió mal en el servidor",
      ...(isDev && { stack: err.stack }),
    });
  });

  return app;
}
