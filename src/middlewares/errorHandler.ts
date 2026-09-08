import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';
import { AppError } from '../types/errors';

interface ErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}

function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  requestId?: string,
  details?: unknown,
): void {
  const body: ErrorBody = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
      ...(requestId ? { requestId } : {}),
    },
  };

  res.status(statusCode).json(body);
}

function isCorsError(err: unknown): boolean {
  return err instanceof Error && err.message === 'Not allowed by CORS';
}

function isMalformedJsonError(err: unknown): boolean {
  return err instanceof SyntaxError && 'body' in err;
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const requestId = 'requestId' in req ? req.requestId : undefined;

  if (res.headersSent) {
    logger.error({ err, requestId }, 'Error after response was sent');
    return;
  }

  if (err instanceof AppError) {
    logger.warn({ err, requestId, code: err.code }, err.message);
    const details = err.statusCode < 500 ? err.details : undefined;
    sendError(res, err.statusCode, err.code, err.message, requestId, details);
    return;
  }

  if (err instanceof ZodError) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Invalid request', requestId, err.flatten());
    return;
  }

  if (isMalformedJsonError(err)) {
    sendError(res, 400, 'INVALID_JSON', 'Malformed JSON body', requestId);
    return;
  }

  if (isCorsError(err)) {
    sendError(res, 403, 'CORS_FORBIDDEN', 'Origin is not allowed', requestId);
    return;
  }

  logger.error({ err, requestId }, 'Unhandled error');

  sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'Internal server error', requestId);
}
