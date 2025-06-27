'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Define the structure for tag-like objects
interface MetadataItem {
  id: string;
  name: string;
}

interface BeatMetadataProps {
  genre: MetadataItem | null; // Allow null if genre might be missing
  tempo: number | null; // Allow null if tempo might be missing
  moods: MetadataItem[];
  tags: MetadataItem[];
  description: string | null;
  className?: string;
}

// Simple component for rendering tag-like links
const MetadataLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <Link href={href} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors">
    {children}
  </Link>
);

export const BeatMetadata: React.FC<BeatMetadataProps> = ({
  genre,
  tempo,
  moods,
  tags,
  description,
  className,
}) => {
  const [showAllTags, setShowAllTags] = useState(false);
  const MAX_VISIBLE_TAGS = 4;
  const visibleTags = showAllTags ? tags : tags.slice(0, MAX_VISIBLE_TAGS);
  const hasMoreTags = tags.length > MAX_VISIBLE_TAGS;

  // Updated link generation function
  const getSearchLink = (type: 'genre' | 'mood' | 'tag', value: string) => {
    // Use name for search link
    return `/search?${type}=${encodeURIComponent(value)}`;
  };

  // Log the arrays to check for duplicates
  console.log("[BeatMetadata] Moods:", moods);
  console.log("[BeatMetadata] Tags:", tags);

  return (
    <div className={cn('space-y-4 text-sm', className)}>

      {/* Description Section */}
      {description && (
        <div>
          <h4 className="text-base font-semibold mb-1.5 text-gray-200">Description</h4>
          <p className="text-gray-300 whitespace-pre-wrap">{description}</p>
        </div>
      )}

      {/* Genre and Tempo */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {genre && (
          <div className="flex items-center">
            <span className="text-gray-400 mr-2">Genre:</span>
            {/* Use genre.name for display and link */}
            <MetadataLink key={genre.id} href={getSearchLink('genre', genre.name)}>{genre.name}</MetadataLink>
          </div>
        )}
        {tempo !== null && (
          <div className="flex items-center">
            <span className="text-gray-400 mr-2">Tempo:</span>
            <span className="text-gray-300">{tempo} BPM</span>
          </div>
        )}
      </div>

      {/* Moods */}
      {moods.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-gray-400 mr-2">Moods:</span>
          {moods.map((mood) => (
            <MetadataLink key={mood.id} href={getSearchLink('mood', mood.name)}>
              {mood.name} 
            </MetadataLink>
          ))}
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-gray-400 mr-2">Tags:</span>
          {visibleTags.map((tag) => (
            <MetadataLink key={tag.id} href={getSearchLink('tag', tag.name)}>
              {tag.name}
            </MetadataLink>
          ))}
          {hasMoreTags && (
             <Button
                variant="link"
                size="sm"
                className="text-purple-300 hover:text-purple-200 h-auto p-0 text-xs"
                onClick={() => setShowAllTags(!showAllTags)}
             >
                 {showAllTags ? 'Show less' : `+${tags.length - MAX_VISIBLE_TAGS} more`}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}; 