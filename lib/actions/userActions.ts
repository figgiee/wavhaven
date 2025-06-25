import { prisma } from '@/lib/db/prisma';
import { UserProfileHeaderData } from '@/types';

export async function getUserProfileByUsername(username: string): Promise<UserProfileHeaderData | null> {
  if (!username) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        profileImageUrl: true,
        createdAt: true,
        sellerProfile: {
          select: {
            bio: true,
            isVerified: true,
            bannerImageUrl: true,
            websiteUrl: true,
            twitterUrl: true,
            instagramUrl: true,
            youtubeUrl: true,
            soundCloudUrl: true,
            tiktokUrl: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      createdAt: user.createdAt,
      sellerProfile: user.sellerProfile ? {
        bio: user.sellerProfile.bio,
        isVerified: user.sellerProfile.isVerified,
        bannerImageUrl: user.sellerProfile.bannerImageUrl,
        websiteUrl: user.sellerProfile.websiteUrl,
        twitterUrl: user.sellerProfile.twitterUrl,
        instagramUrl: user.sellerProfile.instagramUrl,
        youtubeUrl: user.sellerProfile.youtubeUrl,
        soundCloudUrl: user.sellerProfile.soundCloudUrl,
        tiktokUrl: user.sellerProfile.tiktokUrl,
      } : null,
    };
  } catch (error) {
    console.error(`Error fetching profile for username ${username}:`, error);
    return null;
  }
} 