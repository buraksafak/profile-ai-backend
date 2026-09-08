import { Router } from 'express';
import { healthController } from '../controllers/health.controller';
import { asyncHandler } from '../middlewares/async-handler';

export const healthRouter = Router();

healthRouter.get('/', (req, res) => healthController.getHealth(req, res));
healthRouter.get('/ready', asyncHandler((req, res) => healthController.getReady(req, res)));
