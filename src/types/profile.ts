export interface CreateProfileInput {
  name: string;
  bio?: string;
}

export interface ProfileDto {
  id: string;
  name: string;
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;
}
