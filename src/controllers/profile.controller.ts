import type { Request, Response } from 'express';
import { profileService } from '../services/profile.service';

export class ProfileController {
  async create(req: Request, res: Response): Promise<void> {
    const profile = await profileService.create(req.body);
    res.status(201).json({
      success: true,
      data: profile,
    });
  }

  async list(_req: Request, res: Response): Promise<void> {
    const profiles = await profileService.list();
    res.status(200).json({
      success: true,
      data: profiles,
    });
  }

  async getById(req: Request, res: Response): Promise<void> {
    const profile = await profileService.getById(req.params.id as string);
    res.status(200).json({
      success: true,
      data: profile,
    });
  }
}

export const profileController = new ProfileController();
