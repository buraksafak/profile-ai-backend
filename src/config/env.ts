import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  GEMINI_API_KEY: z.string().default(''),
  GEMINI_MODEL: z.string().min(1).default('gemini-3.5-flash-lite'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  API_SECRET_KEY: z.string().min(1, 'API_SECRET_KEY is required'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  RESEND_API_KEY: z.string().default(''),
  CONTACT_TO_EMAIL: z.string().email().default('buraksafak2109@gmail.com'),
  CONTACT_FROM_EMAIL: z.string().min(3).default('Burak Safak <contact@buraksafak.online>'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
