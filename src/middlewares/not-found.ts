import type { NextFunction, Request, Response } from 'express';
import { NotFoundError } from '../types/errors';

export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError('Route not found'));
}
