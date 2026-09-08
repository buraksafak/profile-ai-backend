import path from 'node:path';
import pino from 'pino';
import { env } from '../config/env';

const logsDir = path.join(process.cwd(), 'logs');

const consoleTarget: pino.TransportTargetOptions =
  env.NODE_ENV === 'development'
    ? {
        target: 'pino-pretty',
        level: env.LOG_LEVEL,
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          destination: 1,
        },
      }
    : {
        target: 'pino/file',
        level: env.LOG_LEVEL,
        options: {
          destination: 1,
        },
      };

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'profile-ai' },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ['req.headers.authorization', 'req.headers["x-api-key"]', 'apiKey'],
    remove: true,
  },
  transport: {
    targets: [
      consoleTarget,
      {
        target: 'pino/file',
        level: env.LOG_LEVEL,
        options: {
          destination: path.join(logsDir, 'app.log'),
          mkdir: true,
        },
      },
      {
        target: 'pino/file',
        level: 'error',
        options: {
          destination: path.join(logsDir, 'error.log'),
          mkdir: true,
        },
      },
    ],
  },
});
