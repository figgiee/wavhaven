'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// Standard musical keys (Major and Minor)
const majorKeys = [
  'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#',
  'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'
];
const minorKeys = [
  'Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'A#m',
  'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm', 'Abm'
];

interface KeyFilterProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

export function KeyFilter({ value, onChange }: KeyFilterProps) {
  const handleValueChange = (selectedValue: string) => {
    onChange(selectedValue === 'all' ? undefined : selectedValue);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="key-filter" className="text-sm font-medium text-muted-foreground">Key</Label>
      <Select 
        value={value ?? 'all'} 
        onValueChange={handleValueChange}
      >
        <SelectTrigger id="key-filter" className="w-full bg-neutral-800 border-neutral-700 focus:ring-cyan-glow text-neutral-100">
          <SelectValue placeholder="Any Key" />
        </SelectTrigger>
        <SelectContent className="bg-neutral-800 border-neutral-700 text-neutral-100 max-h-60">
          <SelectItem value="all">Any Key</SelectItem>
          <SelectGroup>
            <SelectLabel className="text-xs text-muted-foreground">Major Keys</SelectLabel>
            {majorKeys.map((key) => (
              <SelectItem key={key} value={key}>
                {key} Major
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel className="text-xs text-muted-foreground">Minor Keys</SelectLabel>
            {minorKeys.map((key) => (
              <SelectItem key={key} value={key}>
                {key} Minor
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
} 