import http from 'node:http';
import { createApp } from './app';
import { connectDb, disconnectDb } from './config/db';
import { env } from './config/env';
import { logger } from './utils/logger';

const SHUTDOWN_TIMEOUT_MS = 15_000;
const LISTEN_HOST = '0.0.0.0';

const app = createApp();
const server = http.createServer(app);

server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

let shuttingDown = false;

async function closeHttpServer(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    logger.warn({ signal }, 'Shutdown already in progress');
    return;
  }

  shuttingDown = true;
  logger.info({ signal }, 'Graceful shutdown started');

  const forceTimer = setTimeout(() => {
    logger.error({ timeoutMs: SHUTDOWN_TIMEOUT_MS }, 'Forced shutdown after timeout');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceTimer.unref();

  try {
    if (server.listening) {
      if (typeof server.closeIdleConnections === 'function') {
        server.closeIdleConnections();
      }

      await closeHttpServer();
      logger.info('HTTP server closed');
    }

    await disconnectDb();
    clearTimeout(forceTimer);
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error: unknown) {
    logger.fatal({ err: error }, 'Error during graceful shutdown');
    process.exit(1);
  }
}

function listen(): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error) => {
      server.off('listening', onListening);
      reject(error);
    };

    const onListening = () => {
      server.off('error', onError);
      resolve();
    };

    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(env.PORT, LISTEN_HOST);
  });
}

function registerProcessHandlers(): void {
  const onSignal = (signal: NodeJS.Signals) => {
    if (shuttingDown) {
      logger.warn({ signal }, 'Second shutdown signal received, forcing exit');
      process.exit(1);
    }

    void shutdown(signal);
  };

  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  process.on('uncaughtException', (error: Error) => {
    logger.fatal({ err: error }, 'Uncaught exception');
    void shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason: unknown) => {
    logger.fatal({ err: reason }, 'Unhandled rejection');
    void shutdown('unhandledRejection');
  });
}

async function bootstrap(): Promise<void> {
  registerProcessHandlers();
  await connectDb();
  await listen();
  logger.info({ port: env.PORT, host: LISTEN_HOST, env: env.NODE_ENV }, 'Server started');
}

bootstrap().catch((error: unknown) => {
  logger.fatal({ err: error }, 'Failed to start server');
  process.exit(1);
});
