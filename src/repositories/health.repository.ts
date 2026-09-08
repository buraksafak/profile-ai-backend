import { prisma } from '../config/db';

export class HealthRepository {
  async ping(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}

export const healthRepository = new HealthRepository();
