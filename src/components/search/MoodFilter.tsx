'use client';

import React from 'react';
import { Label } from "@/components/ui/label";
import { MultiSelect, type Option } from "@/components/ui/multi-select";

// Comprehensive mood and vibe list
const moods: Option[] = [
  // Energy Levels
  { value: 'energetic', label: 'Energetic', group: 'Energy' },
  { value: 'high-energy', label: 'High Energy', group: 'Energy' },
  { value: 'explosive', label: 'Explosive', group: 'Energy' },
  { value: 'chill', label: 'Chill', group: 'Energy' },
  { value: 'relaxed', label: 'Relaxed', group: 'Energy' },
  { value: 'calm', label: 'Calm', group: 'Energy' },
  { value: 'mellow', label: 'Mellow', group: 'Energy' },
  { value: 'peaceful', label: 'Peaceful', group: 'Energy' },

  // Emotional Spectrum
  { value: 'happy', label: 'Happy', group: 'Emotions' },
  { value: 'joyful', label: 'Joyful', group: 'Emotions' },
  { value: 'euphoric', label: 'Euphoric', group: 'Emotions' },
  { value: 'uplifting', label: 'Uplifting', group: 'Emotions' },
  { value: 'sad', label: 'Sad', group: 'Emotions' },
  { value: 'melancholic', label: 'Melancholic', group: 'Emotions' },
  { value: 'nostalgic', label: 'Nostalgic', group: 'Emotions' },
  { value: 'emotional', label: 'Emotional', group: 'Emotions' },
  { value: 'romantic', label: 'Romantic', group: 'Emotions' },
  { value: 'sensual', label: 'Sensual', group: 'Emotions' },

  // Intensity & Aggression
  { value: 'aggressive', label: 'Aggressive', group: 'Intensity' },
  { value: 'intense', label: 'Intense', group: 'Intensity' },
  { value: 'powerful', label: 'Powerful', group: 'Intensity' },
  { value: 'hard', label: 'Hard', group: 'Intensity' },
  { value: 'gentle', label: 'Gentle', group: 'Intensity' },
  { value: 'soft', label: 'Soft', group: 'Intensity' },
  { value: 'smooth', label: 'Smooth', group: 'Intensity' },

  // Darkness & Atmosphere
  { value: 'dark', label: 'Dark', group: 'Atmosphere' },
  { value: 'moody', label: 'Moody', group: 'Atmosphere' },
  { value: 'mysterious', label: 'Mysterious', group: 'Atmosphere' },
  { value: 'haunting', label: 'Haunting', group: 'Atmosphere' },
  { value: 'sinister', label: 'Sinister', group: 'Atmosphere' },
  { value: 'bright', label: 'Bright', group: 'Atmosphere' },
  { value: 'sunny', label: 'Sunny', group: 'Atmosphere' },
  { value: 'warm', label: 'Warm', group: 'Atmosphere' },
  { value: 'cold', label: 'Cold', group: 'Atmosphere' },
  { value: 'ethereal', label: 'Ethereal', group: 'Atmosphere' },

  // Movement & Groove
  { value: 'groovy', label: 'Groovy', group: 'Groove' },
  { value: 'bouncy', label: 'Bouncy', group: 'Groove' },
  { value: 'rhythmic', label: 'Rhythmic', group: 'Groove' },
  { value: 'danceable', label: 'Danceable', group: 'Groove' },
  { value: 'hypnotic', label: 'Hypnotic', group: 'Groove' },
  { value: 'flowing', label: 'Flowing', group: 'Groove' },

  // Creative Vibes
  { value: 'creative', label: 'Creative', group: 'Vibes' },
  { value: 'inspiring', label: 'Inspiring', group: 'Vibes' },
  { value: 'motivational', label: 'Motivational', group: 'Vibes' },
  { value: 'focused', label: 'Focused', group: 'Vibes' },
  { value: 'dreamy', label: 'Dreamy', group: 'Vibes' },
  { value: 'surreal', label: 'Surreal', group: 'Vibes' },
  { value: 'abstract', label: 'Abstract', group: 'Vibes' },

  // Urban & Street
  { value: 'street', label: 'Street', group: 'Urban' },
  { value: 'gritty', label: 'Gritty', group: 'Urban' },
  { value: 'raw', label: 'Raw', group: 'Urban' },
  { value: 'underground', label: 'Underground', group: 'Urban' },
  { value: 'urban', label: 'Urban', group: 'Urban' },
  { value: 'sophisticated', label: 'Sophisticated', group: 'Urban' },
];

interface MoodFilterProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function MoodFilter({ value, onChange }: MoodFilterProps) {
  return (
    <div className="space-y-2">
      <MultiSelect
        id="mood-filter"
        options={moods}
        value={value}
        onChange={onChange}
        placeholder="Select moods..."
        className="w-full"
      />
    </div>
  );
} 