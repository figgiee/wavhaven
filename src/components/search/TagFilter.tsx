'use client';

import React from 'react';
import { Label } from "@/components/ui/label";
import { MultiSelect, type Option } from "@/components/ui/multi-select";

// Comprehensive tags list for beats and music
const tags: Option[] = [
  // Production Style
  { value: 'hard', label: 'Hard', group: 'Production' },
  { value: 'soft', label: 'Soft', group: 'Production' },
  { value: 'clean', label: 'Clean', group: 'Production' },
  { value: 'dirty', label: 'Dirty', group: 'Production' },
  { value: 'crisp', label: 'Crisp', group: 'Production' },
  { value: 'muddy', label: 'Muddy', group: 'Production' },
  { value: 'polished', label: 'Polished', group: 'Production' },
  { value: 'raw', label: 'Raw', group: 'Production' },
  { value: 'professional', label: 'Professional', group: 'Production' },

  // Texture & Feel
  { value: 'smooth', label: 'Smooth', group: 'Texture' },
  { value: 'rough', label: 'Rough', group: 'Texture' },
  { value: 'silky', label: 'Silky', group: 'Texture' },
  { value: 'gritty', label: 'Gritty', group: 'Texture' },
  { value: 'warm', label: 'Warm', group: 'Texture' },
  { value: 'cold', label: 'Cold', group: 'Texture' },
  { value: 'thick', label: 'Thick', group: 'Texture' },
  { value: 'thin', label: 'Thin', group: 'Texture' },
  { value: 'layered', label: 'Layered', group: 'Texture' },

  // Musical Elements
  { value: 'melodic', label: 'Melodic', group: 'Elements' },
  { value: 'harmonic', label: 'Harmonic', group: 'Elements' },
  { value: 'rhythmic', label: 'Rhythmic', group: 'Elements' },
  { value: 'percussive', label: 'Percussive', group: 'Elements' },
  { value: 'vocal', label: 'Vocal', group: 'Elements' },
  { value: 'instrumental', label: 'Instrumental', group: 'Elements' },
  { value: 'acapella', label: 'Acapella', group: 'Elements' },
  { value: 'sampled', label: 'Sampled', group: 'Elements' },
  { value: 'original', label: 'Original', group: 'Elements' },

  // Sonic Characteristics
  { value: 'bright', label: 'Bright', group: 'Sonic' },
  { value: 'dark', label: 'Dark', group: 'Sonic' },
  { value: 'wide', label: 'Wide', group: 'Sonic' },
  { value: 'narrow', label: 'Narrow', group: 'Sonic' },
  { value: 'spacious', label: 'Spacious', group: 'Sonic' },
  { value: 'tight', label: 'Tight', group: 'Sonic' },
  { value: 'reverb-heavy', label: 'Reverb Heavy', group: 'Sonic' },
  { value: 'dry', label: 'Dry', group: 'Sonic' },
  { value: 'compressed', label: 'Compressed', group: 'Sonic' },

  // Tempo Feel
  { value: 'fast', label: 'Fast', group: 'Tempo' },
  { value: 'slow', label: 'Slow', group: 'Tempo' },
  { value: 'mid-tempo', label: 'Mid Tempo', group: 'Tempo' },
  { value: 'driving', label: 'Driving', group: 'Tempo' },
  { value: 'laid-back', label: 'Laid Back', group: 'Tempo' },
  { value: 'urgent', label: 'Urgent', group: 'Tempo' },
  { value: 'relaxed', label: 'Relaxed', group: 'Tempo' },

  // Usage Context
  { value: 'radio-ready', label: 'Radio Ready', group: 'Usage' },
  { value: 'club-banger', label: 'Club Banger', group: 'Usage' },
  { value: 'commercial', label: 'Commercial', group: 'Usage' },
  { value: 'underground', label: 'Underground', group: 'Usage' },
  { value: 'mainstream', label: 'Mainstream', group: 'Usage' },
  { value: 'experimental', label: 'Experimental', group: 'Usage' },
  { value: 'freestyle', label: 'Freestyle', group: 'Usage' },
  { value: 'album-track', label: 'Album Track', group: 'Usage' },

  // Instruments
  { value: 'piano', label: 'Piano', group: 'Instruments' },
  { value: 'guitar', label: 'Guitar', group: 'Instruments' },
  { value: 'bass', label: 'Bass', group: 'Instruments' },
  { value: 'strings', label: 'Strings', group: 'Instruments' },
  { value: 'brass', label: 'Brass', group: 'Instruments' },
  { value: 'woodwinds', label: 'Woodwinds', group: 'Instruments' },
  { value: 'synth', label: 'Synth', group: 'Instruments' },
  { value: 'organ', label: 'Organ', group: 'Instruments' },
  { value: 'drum-machine', label: 'Drum Machine', group: 'Instruments' },
];

interface TagFilterProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function TagFilter({ value, onChange }: TagFilterProps) {
  return (
    <div className="space-y-2">
      <MultiSelect
        id="tag-filter"
        options={tags}
        value={value}
        onChange={onChange}
        placeholder="Select tags..."
        className="w-full"
      />
    </div>
  );
} 