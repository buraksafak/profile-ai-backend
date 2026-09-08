import type { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { ValidationError } from '../types/errors';

export const validate =
  (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      next(new ValidationError('Invalid request', result.error.flatten()));
      return;
    }

    const data = result.data as { body?: unknown; query?: unknown; params?: unknown };
    if (data.body) {
      req.body = data.body;
    }
    next();
  };
