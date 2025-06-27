'use client';

import React from 'react';
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// Define min/max/step for price - adjust as needed
const MIN_PRICE = 0;   // Assuming free is possible
const MAX_PRICE = 200; // Example max price ($200)
const PRICE_STEP = 5; // Example step ($5)

interface PriceRangeFilterProps {
  value: [number, number];
  onChange: (value: [number, number]) => void;
}

export function PriceRangeFilter({ value, onChange }: PriceRangeFilterProps) {
  const handleSliderChange = (newRange: number[]) => {
    onChange([newRange[0], newRange[1]]);
  };

  const handleInputChange = (index: number, inputValue: string) => {
    const newValue = parseInt(inputValue, 10);
    if (!isNaN(newValue) && newValue >= MIN_PRICE && newValue <= MAX_PRICE) {
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

  // Format price for display
  const formatPrice = (price: number) => {
    return price === 0 ? 'Free' : `$${price}`;
  };

  return (
    <div className="space-y-3">
      <Slider
        id="price-range-filter"
        min={MIN_PRICE}
        max={MAX_PRICE}
        step={PRICE_STEP}
        value={value}
        onValueChange={handleSliderChange}
        minStepsBetweenThumbs={1}
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
      <div className="text-center text-xs text-neutral-400">
        {formatPrice(value[0])} - {formatPrice(value[1])}
      </div>
    </div>
  );
} 