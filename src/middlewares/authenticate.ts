import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { UnauthorizedError } from '../types/errors';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const headerKey = req.header('x-api-key');
  const bearer = req.header('authorization');
  const token = headerKey ?? (bearer?.startsWith('Bearer ') ? bearer.slice(7) : undefined);

  if (!token || token !== env.API_SECRET_KEY) {
    next(new UnauthorizedError('Invalid or missing API key'));
    return;
  }

  next();
}
