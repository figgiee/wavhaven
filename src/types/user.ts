// Type definition based on getUserProfileByUsername return structure
import { Prisma } from '@prisma/client';

// Define a specific type for the profile data expected by the header
// This selects fields from the complex type possibly returned by Prisma
export type UserProfileHeaderData = {
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  createdAt: Date;
  sellerProfile: {
    bio: string | null;
    bannerImageUrl: string | null;
    isVerified: boolean;
  } | null;
}; 