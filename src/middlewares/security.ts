import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { env } from '../config/env';
import { UnauthorizedError } from '../types/errors';

const allowedOrigins = env.CORS_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const helmetMiddleware = helmet({
  contentSecurityPolicy: env.NODE_ENV === 'production',
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'no-referrer' },
});

export const corsMiddleware: RequestHandler = cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-request-id'],
});

export const chatRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many chat requests, please try again later',
    },
  },
});

export function apiKeyAuth(req: Request, _res: Response, next: NextFunction): void {
  const apiKey = req.header('x-api-key');

  if (!apiKey || apiKey !== env.API_SECRET_KEY) {
    next(new UnauthorizedError('Invalid or missing API key'));
    return;
  }

  next();
}
