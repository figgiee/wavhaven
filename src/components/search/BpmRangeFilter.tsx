'use client';

import React from 'react';
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input"; // For displaying current values

const MIN_BPM = 60;
const MAX_BPM = 180;
const BPM_STEP = 1;

interface BpmRangeFilterProps {
  value: [number, number] | undefined; // [minBpm, maxBpm]
  onChange: (value: [number, number] | undefined) => void;
}

export function BpmRangeFilter({ value, onChange }: BpmRangeFilterProps) {
  const currentRange = value ?? [MIN_BPM, MAX_BPM];

  const handleSliderChange = (newRange: [number, number]) => {
    // Check if the range is effectively the full range, then pass undefined
    if (newRange[0] === MIN_BPM && newRange[1] === MAX_BPM) {
      onChange(undefined);
    } else {
      onChange(newRange);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <Label htmlFor="bpm-range-filter" className="text-sm font-medium text-muted-foreground">BPM Range</Label>
        <span className="text-xs text-neutral-400">
          {currentRange[0]} - {currentRange[1]} BPM
        </span>
      </div>
      <Slider
        id="bpm-range-filter"
        min={MIN_BPM}
        max={MAX_BPM}
        step={BPM_STEP}
        value={currentRange} // Slider expects an array for two thumbs
        onValueChange={handleSliderChange}
        minStepsBetweenThumbs={1}
        className="w-full [&>span:first-child]:h-1.5 [&>span:first-child]:bg-neutral-700 [&>span:first-child_.bg-primary]:bg-cyan-glow"
      />
      {/* Optional: Input fields to show/set exact BPM values */}
      {/* <div className="flex items-center gap-2">
        <Input type="number" value={currentRange[0]} onChange={(e) => handleSliderChange([+e.target.value, currentRange[1]])} className="w-1/2 bg-neutral-800 border-neutral-700" />
        <Input type="number" value={currentRange[1]} onChange={(e) => handleSliderChange([currentRange[0], +e.target.value])} className="w-1/2 bg-neutral-800 border-neutral-700" />
      </div> */}
    </div>
  );
} 