'use client';

import React from 'react';
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const MIN_BPM = 60;
const MAX_BPM = 180;
const BPM_STEP = 1;

interface BpmRangeFilterProps {
  value: [number, number];
  onChange: (value: [number, number]) => void;
}

export function BpmRangeFilter({ value, onChange }: BpmRangeFilterProps) {
  const handleSliderChange = (newRange: number[]) => {
    onChange([newRange[0], newRange[1]]);
  };

  const handleInputChange = (index: number, inputValue: string) => {
    const newValue = parseInt(inputValue, 10);
    if (!isNaN(newValue) && newValue >= MIN_BPM && newValue <= MAX_BPM) {
      const newRange = [...value] as [number, number];
      newRange[index] = newValue;
      // Ensure min doesn't exceed max and vice-versa
      if (index === 0 && newValue > newRange[1]) {
        newRange[1] = newValue;
      }
      if (index === 1 && newValue < newRange[0]) {
        newRange[0] = newValue;
      }
      onChange(newRange);
    }
  };

  return (
    <div className="space-y-3">
      <Slider
        id="bpm-range-filter"
        min={MIN_BPM}
        max={MAX_BPM}
        step={BPM_STEP}
        value={value}
        onValueChange={handleSliderChange}
        minStepsBetweenThumbs={5}
        className="w-full [&>span:first-child]:h-1.5 [&>span:first-child]:bg-neutral-700 [&>span>span]:bg-cyan-glow [&>span>span]:h-3 [&>span>span]:w-3 [&>span>span]:border-2 [&>span>span]:border-neutral-900"
      />
      <div className="flex justify-between items-center gap-2">
        <Input 
          type="number" 
          value={value[0]} 
          onChange={(e) => handleInputChange(0, e.target.value)} 
          className="h-8 text-xs text-center bg-neutral-800 border-neutral-700 focus:ring-cyan-glow focus:border-cyan-glow text-neutral-100" 
        />
        <span className="text-neutral-500 text-xs">to</span>
        <Input 
          type="number" 
          value={value[1]} 
          onChange={(e) => handleInputChange(1, e.target.value)} 
          className="h-8 text-xs text-center bg-neutral-800 border-neutral-700 focus:ring-cyan-glow focus:border-cyan-glow text-neutral-100" 
        />
      </div>
    </div>
  );
} 