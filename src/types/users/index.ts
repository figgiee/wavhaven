// src/types/users/index.ts
// Type definition based on getUserProfileByUsername return structure
import { Prisma } from '@prisma/client';

// Define a specific type for the profile data expected by the header
// This selects fields from the complex type possibly returned by Prisma
export type UserProfileHeaderData = {
  id: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  createdAt: Date;
  sellerProfile: {
    bio: string | null;
    bannerImageUrl: string | null;
    isVerified: boolean;
    websiteUrl: string | null;
    twitterUrl: string | null;
    instagramUrl: string | null;
    youtubeUrl: string | null;
    soundCloudUrl: string | null;
    tiktokUrl: string | null;
  } | null;
}; 