import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env, allowedOrigins } from './config/env.js';
import { apiRouter } from './routes/app-route.js';
import { requestContext } from './middlewares/context.js';
import { apiLimiter } from './middlewares/security.js';
import { errorHandler, notFound } from './middlewares/errors-handler.js';
__DOCS_IMPORT__

/** Construct an app without listening, starting jobs, or connecting to providers. */
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY_HOPS);
  app.use(requestContext, helmet());
  app.use(cors({ origin: allowedOrigins, credentials: true, exposedHeaders: ['X-Request-ID'] }));
  app.use(apiLimiter, express.json({ limit: '256kb' }));
  __DOCS_MOUNT__
  app.use('/api', apiRouter);
  app.use(notFound, errorHandler);
  return app;
}
