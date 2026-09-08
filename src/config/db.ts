import { PrismaClient } from '@prisma/client';
import { env } from './env';
import { logger } from '../utils/logger';

const createPrismaClient = () =>
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
  prismaShutdownRegistered?: boolean;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

let disconnecting = false;

export async function connectDb(): Promise<void> {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
  logger.info('Database connection established');
}

export async function disconnectDb(): Promise<void> {
  if (disconnecting) {
    return;
  }

  disconnecting = true;

  try {
    await prisma.$disconnect();
    logger.info('Database connection closed');
  } catch (error: unknown) {
    logger.error({ err: error }, 'Failed to close database connection');
  }
}

function registerShutdownHooks(): void {
  if (globalForPrisma.prismaShutdownRegistered) {
    return;
  }

  globalForPrisma.prismaShutdownRegistered = true;

  process.on('beforeExit', () => {
    void disconnectDb();
  });
}

registerShutdownHooks();
