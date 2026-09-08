import type { Profile } from '@prisma/client';
import { prisma } from '../config/db';
import type { CreateProfileInput } from '../types/profile';

export class ProfileRepository {
  async create(data: CreateProfileInput): Promise<Profile> {
    return prisma.profile.create({ data });
  }

  async findAll(): Promise<Profile[]> {
    return prisma.profile.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findById(id: string): Promise<Profile | null> {
    return prisma.profile.findUnique({ where: { id } });
  }
}

export const profileRepository = new ProfileRepository();
