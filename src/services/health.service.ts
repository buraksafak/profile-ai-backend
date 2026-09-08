import { healthRepository } from '../repositories/health.repository';
import type { FullHealthStatus, HealthStatus, ReadyStatus } from '../types/health';

export class HealthService {
  getStatus(): HealthStatus {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness(): Promise<ReadyStatus> {
    const databaseUp = await healthRepository.ping();
    return {
      status: databaseUp ? 'ready' : 'degraded',
      database: databaseUp ? 'up' : 'down',
      timestamp: new Date().toISOString(),
    };
  }

  async getFullStatus(): Promise<FullHealthStatus> {
    const databaseUp = await healthRepository.ping();
    return {
      status: databaseUp ? 'ok' : 'degraded',
      server: {
        status: 'up',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
      database: {
        status: databaseUp ? 'up' : 'down',
      },
    };
  }
}

export const healthService = new HealthService();
