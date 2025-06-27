// src/types/index.ts
// Re-export all types from domain-specific modules
export * from './tracks';
export * from './users';
export * from './licenses';

export interface LicenseSummary {
    price: number;
    // ... any other license properties needed for the card
}

export interface Beat {
    id: string | number;
    title: string;
    producerName: string;
    audioSrc: string;
    imageUrl?: string | null;
    coverImageUrl?: string | null; // From TrackFile
    beatUrl?: string; // a link to the beat page
    slug?: string;
    licenses?: LicenseSummary[];
    isLiked?: boolean; // For optimistic updates
}

export type UserProfileHeaderData = {
    id: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
    createdAt: Date;
    sellerProfile: {
        bio: string | null;
        websiteUrl: string | null;
        twitterUrl: string | null;
        instagramUrl: string | null;
        youtubeUrl: string | null;
        soundCloudUrl: string | null;
        bannerImageUrl: string | null;
        isVerified: boolean;
    } | null;
};