import { Router } from 'express';
import { healthRouter } from './health.routes';
import { geminiRouter } from './gemini.routes';
import { profileRouter } from './profile.routes';
import { learningRouter } from './learning.routes';

export { chatRouter, chatRoutes } from './chatRoutes';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/gemini', geminiRouter);
apiRouter.use('/profiles', profileRouter);
apiRouter.use('/learning', learningRouter);
