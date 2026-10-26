/** Build the HTTP application. Importing this module never starts the listener. */
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env, allowedOrigins } from "./config/env.js";
import apiRouter from "./routes/app-route.js";
import { requestContext } from "./middlewares/context.js";
import { customLogger } from "./middlewares/custom-logger.js";
import { apiLimiter } from "./middlewares/security.js";
import { notFound } from "./middlewares/not-found.js";
import { errorHandlerMiddleware } from "./middlewares/errors-handler.js";
__DOCS_IMPORT__

/** Compose middleware in request order so errors share logging, IDs and response formatting. */
export function createApp() {
  const app = express();

  // Apply request context first, including for rejected JSON and rate-limited requests.
  app.use(requestContext, customLogger);
  app.disable("x-powered-by");
  app.set("trust proxy", env.TRUST_PROXY_HOPS);
  app.use(helmet());
  app.use(cors({ origin: allowedOrigins, credentials: true, exposedHeaders: ["X-Request-ID"] }));

  // Bound request volume and body size before controllers can receive untrusted input.
  app.use(apiLimiter, express.json({ limit: "256kb" }));
  __DOCS_MOUNT__

  // app-route.ts mounts the selected feature routers under the shared API prefix.
  app.use("/api", apiRouter);

  // Unmatched routes become typed errors; the error handler must be registered last.
  app.use(notFound);
  app.use(errorHandlerMiddleware);
  return app;
}
