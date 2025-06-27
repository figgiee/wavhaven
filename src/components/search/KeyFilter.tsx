'use client';

import React from 'react';
import { Label } from "@/components/ui/label";
import { MultiSelect, type Option } from "@/components/ui/multi-select";

// Standard musical keys with proper grouping
const keys: Option[] = [
  // Major Keys
  { value: 'C', label: 'C Major', group: 'Major Keys' },
  { value: 'G', label: 'G Major', group: 'Major Keys' },
  { value: 'D', label: 'D Major', group: 'Major Keys' },
  { value: 'A', label: 'A Major', group: 'Major Keys' },
  { value: 'E', label: 'E Major', group: 'Major Keys' },
  { value: 'B', label: 'B Major', group: 'Major Keys' },
  { value: 'F#', label: 'F# Major', group: 'Major Keys' },
  { value: 'C#', label: 'C# Major', group: 'Major Keys' },
  { value: 'F', label: 'F Major', group: 'Major Keys' },
  { value: 'Bb', label: 'Bb Major', group: 'Major Keys' },
  { value: 'Eb', label: 'Eb Major', group: 'Major Keys' },
  { value: 'Ab', label: 'Ab Major', group: 'Major Keys' },
  { value: 'Db', label: 'Db Major', group: 'Major Keys' },
  { value: 'Gb', label: 'Gb Major', group: 'Major Keys' },
  { value: 'Cb', label: 'Cb Major', group: 'Major Keys' },

  // Minor Keys
  { value: 'Am', label: 'A Minor', group: 'Minor Keys' },
  { value: 'Em', label: 'E Minor', group: 'Minor Keys' },
  { value: 'Bm', label: 'B Minor', group: 'Minor Keys' },
  { value: 'F#m', label: 'F# Minor', group: 'Minor Keys' },
  { value: 'C#m', label: 'C# Minor', group: 'Minor Keys' },
  { value: 'G#m', label: 'G# Minor', group: 'Minor Keys' },
  { value: 'D#m', label: 'D# Minor', group: 'Minor Keys' },
  { value: 'A#m', label: 'A# Minor', group: 'Minor Keys' },
  { value: 'Dm', label: 'D Minor', group: 'Minor Keys' },
  { value: 'Gm', label: 'G Minor', group: 'Minor Keys' },
  { value: 'Cm', label: 'C Minor', group: 'Minor Keys' },
  { value: 'Fm', label: 'F Minor', group: 'Minor Keys' },
  { value: 'Bbm', label: 'Bb Minor', group: 'Minor Keys' },
  { value: 'Ebm', label: 'Eb Minor', group: 'Minor Keys' },
  { value: 'Abm', label: 'Ab Minor', group: 'Minor Keys' },
];

interface KeyFilterProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function KeyFilter({ value, onChange }: KeyFilterProps) {
  return (
    <div className="space-y-2">
      <MultiSelect
        id="key-filter"
        options={keys}
        value={value}
        onChange={onChange}
        placeholder="Select keys..."
        className="w-full"
      />
    </div>
  );
} 