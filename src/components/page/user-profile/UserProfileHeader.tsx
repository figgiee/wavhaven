import React from 'react';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { UserProfileHeaderData } from '@/types/user'; // Import the type
import { cn } from '@/lib/utils'; // For class merging
import { format } from 'date-fns'; // For date formatting

interface UserProfileHeaderProps {
  userProfile: UserProfileHeaderData;
  className?: string;
}

export const UserProfileHeader: React.FC<UserProfileHeaderProps> = ({ userProfile, className }) => {
  const fallbackInitials = `${userProfile.firstName?.charAt(0) ?? ''}${userProfile.lastName?.charAt(0) ?? ''}` || 'U';
  const displayName = userProfile.firstName || userProfile.lastName ? `${userProfile.firstName} ${userProfile.lastName}`.trim() : userProfile.username;

  return (
    <div className={cn('relative', className)}>
      {/* Banner Image with Fallback */}
      <div className="h-48 w-full bg-muted relative overflow-hidden">
        {userProfile.sellerProfile?.bannerImageUrl ? (
          <Image
            src={userProfile.sellerProfile.bannerImageUrl}
            alt={`${displayName ?? 'User'}'s banner`}
            layout="fill"
            objectFit="cover"
            priority // Prioritize banner loading
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-r from-slate-500 to-slate-700"></div> // Simple gradient fallback
        )}
      </div>

      {/* Profile Info Overlay */}
      <div className="absolute bottom-0 left-4 transform translate-y-1/2 flex items-end space-x-4">
        {/* Avatar */}
        <Avatar className="h-24 w-24 border-4 border-background">
          <AvatarImage src={userProfile.profileImageUrl ?? undefined} alt={`${displayName ?? 'User'}'s profile picture`} />
          <AvatarFallback>{fallbackInitials}</AvatarFallback>
        </Avatar>

        {/* Name, Username, Verified Badge */}
        <div className="mb-1">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-primary-foreground shadow-sm">{displayName}</h1>
            {userProfile.sellerProfile?.isVerified && (
              <Badge variant="default" className="text-xs">Verified</Badge>
            )}
          </div>
          {userProfile.username && <p className="text-sm text-muted-foreground">@{userProfile.username}</p>}
        </div>
      </div>

      {/* Spacer to push content below the overlay */}
      <div className="pt-16 px-4 pb-4"> {/* Adjust top padding based on avatar size + desired spacing */} 
        {/* Bio */}
        {userProfile.sellerProfile?.bio && (
          <p className="mt-2 text-sm text-muted-foreground">{userProfile.sellerProfile.bio}</p>
        )}

        {/* Joined Date */}
        <p className="mt-1 text-xs text-muted-foreground">
          Joined {format(new Date(userProfile.createdAt), 'PPP')} {/* Format date nicely */}
        </p>
        
        {/* TODO: Add Follow Button / Stats / etc. later */}
      </div>
    </div>
  );
}; 