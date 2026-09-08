import path from 'node:path';
import pino from 'pino';
import { env } from '../config/env';

const baseOptions: pino.LoggerOptions = {
  level: env.LOG_LEVEL,
  base: { service: 'profile-ai' },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ['req.headers.authorization', 'req.headers["x-api-key"]', 'apiKey'],
    remove: true,
  },
};

export const logger =
  env.NODE_ENV === 'development'
    ? pino({
        ...baseOptions,
        transport: {
          targets: [
            {
              target: 'pino-pretty',
              level: env.LOG_LEVEL,
              options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
                destination: 1,
              },
            },
            {
              target: 'pino/file',
              level: env.LOG_LEVEL,
              options: {
                destination: path.join(process.cwd(), 'logs', 'app.log'),
                mkdir: true,
              },
            },
            {
              target: 'pino/file',
              level: 'error',
              options: {
                destination: path.join(process.cwd(), 'logs', 'error.log'),
                mkdir: true,
              },
            },
          ],
        },
      })
    : pino(baseOptions);
