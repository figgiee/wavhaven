import React from 'react';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { UserProfileHeaderData } from '@/types'; // Import the type
import { cn } from '@/lib/utils'; // For class merging
import { format } from 'date-fns'; // For date formatting
import Link from 'next/link'; // Import Link
import {
  Globe,
  Twitter,
  Instagram,
  Youtube,
  Twitch, // Maybe replace with SoundCloud?
  Linkedin, // Maybe replace with TikTok?
  Link as LinkIcon, // Generic link
} from 'lucide-react';

// Helper component for social links
interface SocialLinkProps {
  href: string | null | undefined;
  icon: React.ElementType;
  label: string;
}

const SocialLink: React.FC<SocialLinkProps> = ({ href, icon: Icon, label }) => {
  if (!href) return null;
  
  // Basic URL validation (optional)
  let validHref = href;
  if (!href.startsWith('http://') && !href.startsWith('https://')) {
    validHref = `https://${href}`; // Attempt to fix common missing protocol
  }
  try {
    new URL(validHref);
  } catch (_) {
    console.warn(`Invalid URL provided for ${label}: ${href}`);
    return null; // Don't render invalid links
  }
  
  return (
    <Link href={validHref} target="_blank" rel="noopener noreferrer" aria-label={label}>
      <Icon className="w-5 h-5 text-muted-foreground hover:text-cyan-glow transition-colors" />
    </Link>
  );
};

interface UserProfileHeaderProps {
  userProfile: UserProfileHeaderData;
  className?: string;
}

export const UserProfileHeader: React.FC<UserProfileHeaderProps> = ({ userProfile, className }) => {
  const fallbackInitials = `${userProfile.firstName?.charAt(0) ?? ''}${userProfile.lastName?.charAt(0) ?? ''}` || 'U';
  const displayName = userProfile.firstName || userProfile.lastName ? `${userProfile.firstName} ${userProfile.lastName}`.trim() : userProfile.username;
  const sellerProfile = userProfile.sellerProfile; // Alias for easier access

  return (
    <section 
      className={cn('relative bg-card rounded-b-xl shadow-lg', className)}
      data-testid="user-profile-header"
    >
      {/* Banner Image with Fallback */}
      <div className="h-48 md:h-64 w-full bg-muted relative overflow-hidden rounded-t-xl">
        {userProfile.sellerProfile?.bannerImageUrl ? (
          <Image
            src={userProfile.sellerProfile.bannerImageUrl}
            alt={`${displayName ?? 'User'}'s banner`}
            layout="fill"
            objectFit="cover"
            priority
            className="rounded-t-xl"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-abyss-blue via-neutral-900 to-neutral-800 rounded-t-xl"></div>
        )}
      </div>

      {/* Profile Info Overlay */}
      <div className="absolute bottom-0 left-4 md:left-8 transform translate-y-1/2 flex items-end space-x-4">
        {/* Avatar */}
        <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background shadow-md">
          <AvatarImage src={userProfile.profileImageUrl ?? undefined} alt={`${displayName ?? 'User'}'s profile picture`} />
          <AvatarFallback className="text-4xl md:text-5xl bg-primary text-primary-foreground">{fallbackInitials}</AvatarFallback>
        </Avatar>

        {/* Name, Username, Verified Badge */}
        <div className="mb-2 md:mb-3">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl md:text-2xl font-bold text-foreground" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}>{displayName}</h1>
            {userProfile.sellerProfile?.isVerified && (
              <Badge variant="default" className="bg-cyan-glow text-abyss-blue text-xs px-2 py-0.5">Verified</Badge>
            )}
          </div>
          {userProfile.username && <p className="text-xs md:text-sm text-muted-foreground">@{userProfile.username}</p>}
        </div>
      </div>

      {/* Spacer to push content below the overlay */}
      <div className="pt-16 md:pt-20 px-4 md:px-8 pb-4 md:pb-6">
        {/* Bio */}
        {sellerProfile?.bio && (
          <p className="mt-2 text-sm text-foreground max-w-prose">{sellerProfile.bio}</p>
        )}

        {/* Joined Date */}
        <p className="mt-1 text-xs text-muted-foreground">
          Joined {format(new Date(userProfile.createdAt), 'PPP')}
        </p>

        {/* Social Links Section */}
        <div className="mt-4 flex items-center space-x-4">
          <SocialLink href={sellerProfile?.websiteUrl} icon={Globe} label="Website" />
          <SocialLink href={sellerProfile?.twitterUrl} icon={Twitter} label="Twitter" />
          <SocialLink href={sellerProfile?.instagramUrl} icon={Instagram} label="Instagram" />
          <SocialLink href={sellerProfile?.youtubeUrl} icon={Youtube} label="YouTube" />
          {/* Replace Twitch/Linkedin with SoundCloud/TikTok if those icons exist or use generic LinkIcon */}
          {/* <SocialLink href={sellerProfile?.soundcloudUrl} icon={SoundCloudIcon} label="SoundCloud" /> */}
          {/* <SocialLink href={sellerProfile?.tiktokUrl} icon={TikTokIcon} label="TikTok" /> */}
          {/* Use generic icon as fallback for soundcloud/tiktok if specific icons aren't available */}
          <SocialLink href={sellerProfile?.soundcloudUrl} icon={LinkIcon} label="SoundCloud" />
          <SocialLink href={sellerProfile?.tiktokUrl} icon={LinkIcon} label="TikTok" />
        </div>
        
        {/* TODO: Add Follow Button / Stats / etc. later */}
      </div>
    </section>
  );
}; 