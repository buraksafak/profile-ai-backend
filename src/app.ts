import express from 'express';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { setupSwagger } from './config/swagger';
import { chatController } from './controllers/chatController';
import { apiRouter } from './routes';
import { chatRouter } from './routes/chatRoutes';
import { logger } from './utils/logger';
import {
  apiRateLimiter,
  asyncHandler,
  corsMiddleware,
  errorHandler,
  helmetMiddleware,
  notFound,
  requestId,
} from './middlewares';

function isQuietPath(url: string | undefined): boolean {
  if (!url) {
    return false;
  }

  const path = url.split('?')[0] ?? '';
  return (
    path === '/health' ||
    path === '/api/health' ||
    path === '/api/v1/health' ||
    path === '/api/v1/health/ready' ||
    path === '/docs.json' ||
    path === '/docs' ||
    path.startsWith('/docs/')
  );
}

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(requestId);
  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => isQuietPath(req.url),
      },
      customProps: (req) => ({
        requestId: 'requestId' in req ? req.requestId : undefined,
      }),
    }),
  );
  app.use(apiRateLimiter);

  app.get('/', (_req, res) => {
    res.json({
      success: true,
      data: {
        name: 'profile-ai',
        env: env.NODE_ENV,
        docs: '/docs',
      },
    });
  });

  setupSwagger(app);

  app.get(
    '/health',
    asyncHandler((req, res) => chatController.health(req, res)),
  );

  app.use('/api/v1', apiRouter);
  app.use('/api', chatRouter);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
