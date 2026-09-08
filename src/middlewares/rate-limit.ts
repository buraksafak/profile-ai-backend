import { rateLimit } from 'express-rate-limit';

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: (req) =>
    req.path === '/health' ||
    req.path.endsWith('/health') ||
    req.path === '/docs.json' ||
    req.path === '/docs' ||
    req.path.startsWith('/docs/'),
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
});
