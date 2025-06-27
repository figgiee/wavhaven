'use client';

import React from 'react';
import { Label } from "@/components/ui/label";
import { MultiSelect, type Option } from "@/components/ui/multi-select";

// Expanded genre list to demonstrate the multi-select pattern
const genres: Option[] = [
  // Hip Hop & Rap Subgenres
  { value: 'hip-hop', label: 'Hip Hop', group: 'Hip Hop & Rap' },
  { value: 'trap', label: 'Trap', group: 'Hip Hop & Rap' },
  { value: 'drill', label: 'Drill', group: 'Hip Hop & Rap' },
  { value: 'boom-bap', label: 'Boom Bap', group: 'Hip Hop & Rap' },
  { value: 'mumble-rap', label: 'Mumble Rap', group: 'Hip Hop & Rap' },
  { value: 'conscious-rap', label: 'Conscious Rap', group: 'Hip Hop & Rap' },
  { value: 'gangsta-rap', label: 'Gangsta Rap', group: 'Hip Hop & Rap' },
  { value: 'old-school-rap', label: 'Old School', group: 'Hip Hop & Rap' },

  // Electronic & EDM
  { value: 'electronic', label: 'Electronic', group: 'Electronic & EDM' },
  { value: 'house', label: 'House', group: 'Electronic & EDM' },
  { value: 'techno', label: 'Techno', group: 'Electronic & EDM' },
  { value: 'dubstep', label: 'Dubstep', group: 'Electronic & EDM' },
  { value: 'drum-and-bass', label: 'Drum & Bass', group: 'Electronic & EDM' },
  { value: 'trance', label: 'Trance', group: 'Electronic & EDM' },
  { value: 'ambient', label: 'Ambient', group: 'Electronic & EDM' },
  { value: 'synthwave', label: 'Synthwave', group: 'Electronic & EDM' },
  { value: 'future-bass', label: 'Future Bass', group: 'Electronic & EDM' },
  { value: 'garage', label: 'Garage', group: 'Electronic & EDM' },

  // R&B & Soul
  { value: 'rnb', label: 'R&B', group: 'R&B & Soul' },
  { value: 'neo-soul', label: 'Neo Soul', group: 'R&B & Soul' },
  { value: 'funk', label: 'Funk', group: 'R&B & Soul' },
  { value: 'soul', label: 'Soul', group: 'R&B & Soul' },
  { value: 'motown', label: 'Motown', group: 'R&B & Soul' },

  // Pop & Mainstream
  { value: 'pop', label: 'Pop', group: 'Pop & Mainstream' },
  { value: 'dance-pop', label: 'Dance Pop', group: 'Pop & Mainstream' },
  { value: 'electropop', label: 'Electropop', group: 'Pop & Mainstream' },
  { value: 'indie-pop', label: 'Indie Pop', group: 'Pop & Mainstream' },
  { value: 'synth-pop', label: 'Synth Pop', group: 'Pop & Mainstream' },

  // Rock & Alternative
  { value: 'rock', label: 'Rock', group: 'Rock & Alternative' },
  { value: 'indie-rock', label: 'Indie Rock', group: 'Rock & Alternative' },
  { value: 'alternative', label: 'Alternative', group: 'Rock & Alternative' },
  { value: 'punk', label: 'Punk', group: 'Rock & Alternative' },
  { value: 'grunge', label: 'Grunge', group: 'Rock & Alternative' },

  // Jazz & Blues
  { value: 'jazz', label: 'Jazz', group: 'Jazz & Blues' },
  { value: 'blues', label: 'Blues', group: 'Jazz & Blues' },
  { value: 'smooth-jazz', label: 'Smooth Jazz', group: 'Jazz & Blues' },
  { value: 'fusion', label: 'Fusion', group: 'Jazz & Blues' },

  // World & Regional
  { value: 'afrobeat', label: 'Afrobeat', group: 'World & Regional' },
  { value: 'reggae', label: 'Reggae', group: 'World & Regional' },
  { value: 'dancehall', label: 'Dancehall', group: 'World & Regional' },
  { value: 'latin', label: 'Latin', group: 'World & Regional' },
  { value: 'reggaeton', label: 'Reggaeton', group: 'World & Regional' },

  // Atmospheric & Chill
  { value: 'lo-fi', label: 'Lo-fi', group: 'Atmospheric & Chill' },
  { value: 'chillhop', label: 'Chillhop', group: 'Atmospheric & Chill' },
  { value: 'downtempo', label: 'Downtempo', group: 'Atmospheric & Chill' },
  { value: 'trip-hop', label: 'Trip Hop', group: 'Atmospheric & Chill' },
  { value: 'chillwave', label: 'Chillwave', group: 'Atmospheric & Chill' },
];

interface GenreFilterProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function GenreFilter({ value, onChange }: GenreFilterProps) {
  return (
    <div className="space-y-2">
      <MultiSelect
        id="genre-filter"
        options={genres}
        value={value}
        onChange={onChange}
        placeholder="Select genres..."
        className="w-full"
      />
    </div>
  );
} 