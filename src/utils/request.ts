import type { Request } from 'express';

export function getClientIp(req: Request): string | null {
  const ip = req.ip ?? req.socket.remoteAddress;
  if (!ip) {
    return null;
  }

  return ip.replace(/^::ffff:/, '');
}

export function getUserAgent(req: Request): string | null {
  return req.get('user-agent') ?? null;
}
