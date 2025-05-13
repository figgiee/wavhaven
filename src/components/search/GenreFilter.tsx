'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// TODO: Fetch genres dynamically later
const genres = [
  { value: 'hip-hop', label: 'Hip Hop' },
  { value: 'trap', label: 'Trap' },
  { value: 'rnb', label: 'R&B' },
  { value: 'pop', label: 'Pop' },
  { value: 'electronic', label: 'Electronic' },
  { value: 'lo-fi', label: 'Lo-fi' },
  // Add more genres as needed
];

interface GenreFilterProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

export function GenreFilter({ value, onChange }: GenreFilterProps) {
  // Handle Select's onValueChange which returns '' for the placeholder/reset
  const handleValueChange = (selectedValue: string) => {
    onChange(selectedValue === 'all' ? undefined : selectedValue);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="genre-filter" className="text-sm font-medium text-muted-foreground">Genre</Label>
      <Select 
        value={value ?? 'all'} 
        onValueChange={handleValueChange}
      >
        <SelectTrigger id="genre-filter" className="w-full bg-neutral-800 border-neutral-700 focus:ring-cyan-glow text-neutral-100">
          <SelectValue placeholder="All Genres" />
        </SelectTrigger>
        <SelectContent className="bg-neutral-800 border-neutral-700 text-neutral-100">
          <SelectItem value="all">All Genres</SelectItem>
          {genres.map((genre) => (
            <SelectItem key={genre.value} value={genre.value}>
              {genre.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 