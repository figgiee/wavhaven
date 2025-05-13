'use client';

import React from 'react';
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { formatPrice } from '@/lib/utils'; // For displaying currency

// Define min/max/step for price - adjust as needed
const MIN_PRICE = 0;   // Assuming free is possible
const MAX_PRICE = 200; // Example max price ($200)
const PRICE_STEP = 5; // Example step ($5)

interface PriceRangeFilterProps {
  value: [number, number] | undefined; // [minPrice, maxPrice] (in dollars)
  onChange: (value: [number, number] | undefined) => void;
}

export function PriceRangeFilter({ value, onChange }: PriceRangeFilterProps) {
  const currentRange = value ?? [MIN_PRICE, MAX_PRICE];

  const handleSliderChange = (newRange: [number, number]) => {
    // Check if the range is effectively the full range
    if (newRange[0] === MIN_PRICE && newRange[1] === MAX_PRICE) {
      onChange(undefined);
    } else {
      onChange(newRange);
    }
  };

  // Format the displayed price range
  const formattedMin = formatPrice(currentRange[0]);
  const formattedMax = formatPrice(currentRange[1]);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <Label htmlFor="price-range-filter" className="text-sm font-medium text-muted-foreground">Price Range</Label>
        <span className="text-xs text-neutral-400">
          {formattedMin} - {formattedMax}
        </span>
      </div>
      <Slider
        id="price-range-filter"
        min={MIN_PRICE}
        max={MAX_PRICE}
        step={PRICE_STEP}
        value={currentRange}
        onValueChange={handleSliderChange}
        minStepsBetweenThumbs={1} // Allow min/max to be the same
        className="w-full [&>span:first-child]:h-1.5 [&>span:first-child]:bg-neutral-700 [&>span:first-child_.bg-primary]:bg-cyan-glow"
      />
    </div>
  );
} 