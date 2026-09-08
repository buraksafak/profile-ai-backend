import { Router } from 'express';
import { profileController } from '../controllers/profile.controller';
import { authenticate } from '../middlewares/authenticate';
import { asyncHandler } from '../middlewares/async-handler';
import { validate } from '../middlewares/validate';
import { createProfileSchema, profileIdParamsSchema } from '../utils/schemas';

export const profileRouter = Router();

profileRouter.use(authenticate);

profileRouter.post(
  '/',
  validate(createProfileSchema),
  asyncHandler((req, res) => profileController.create(req, res)),
);

profileRouter.get('/', asyncHandler((req, res) => profileController.list(req, res)));

profileRouter.get(
  '/:id',
  validate(profileIdParamsSchema),
  asyncHandler((req, res) => profileController.getById(req, res)),
);
