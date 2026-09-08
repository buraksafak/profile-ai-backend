import { profileRepository } from '../repositories/profile.repository';
import { NotFoundError } from '../types/errors';
import type { CreateProfileInput, ProfileDto } from '../types/profile';

export class ProfileService {
  async create(input: CreateProfileInput): Promise<ProfileDto> {
    return profileRepository.create(input);
  }

  async list(): Promise<ProfileDto[]> {
    return profileRepository.findAll();
  }

  async getById(id: string): Promise<ProfileDto> {
    const profile = await profileRepository.findById(id);
    if (!profile) {
      throw new NotFoundError('Profile not found');
    }
    return profile;
  }
}

export const profileService = new ProfileService();
