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

// TODO: Fetch moods dynamically later or refine list
const moods = [
  { value: 'happy', label: 'Happy' },
  { value: 'sad', label: 'Sad' },
  { value: 'energetic', label: 'Energetic' },
  { value: 'chill', label: 'Chill' },
  { value: 'dark', label: 'Dark' },
  { value: 'romantic', label: 'Romantic' },
  // Add more moods as needed
];

interface MoodFilterProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

export function MoodFilter({ value, onChange }: MoodFilterProps) {
  // Handle Select's onValueChange which returns '' for the placeholder/reset
  const handleValueChange = (selectedValue: string) => {
    onChange(selectedValue === 'all' ? undefined : selectedValue);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="mood-filter" className="text-sm font-medium text-muted-foreground">Mood</Label>
      <Select 
        value={value ?? 'all'} 
        onValueChange={handleValueChange}
      >
        <SelectTrigger id="mood-filter" className="w-full bg-neutral-800 border-neutral-700 focus:ring-cyan-glow text-neutral-100">
          <SelectValue placeholder="All Moods" />
        </SelectTrigger>
        <SelectContent className="bg-neutral-800 border-neutral-700 text-neutral-100">
          <SelectItem value="all">All Moods</SelectItem>
          {moods.map((mood) => (
            <SelectItem key={mood.value} value={mood.value}>
              {mood.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 