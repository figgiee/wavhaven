'use client';

import React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { LicenseType } from '@prisma/client'; // Import enum for type safety

// Assuming LicenseType enum is available and contains relevant types
// Example: enum LicenseType { BASIC, PREMIUM, EXCLUSIVE }
const availableLicenses = Object.values(LicenseType);

interface LicenseTypeFilterProps {
  value: LicenseType[] | undefined; // Array of selected license types
  onChange: (value: LicenseType[] | undefined) => void;
}

export function LicenseTypeFilter({ value, onChange }: LicenseTypeFilterProps) {
  const selectedTypes = value ?? []; // Default to empty array if undefined

  const handleCheckboxChange = (licenseType: LicenseType, checked: boolean | string) => {
    let newSelectedTypes: LicenseType[];
    if (checked) {
      newSelectedTypes = [...selectedTypes, licenseType];
    } else {
      newSelectedTypes = selectedTypes.filter(type => type !== licenseType);
    }

    // If no types are selected, call onChange with undefined, otherwise with the array
    onChange(newSelectedTypes.length === 0 ? undefined : newSelectedTypes);
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-muted-foreground">License Types</Label>
      <div className="space-y-2">
        {availableLicenses.map((licenseType) => (
          <div key={licenseType} className="flex items-center space-x-2">
            <Checkbox 
              id={`license-${licenseType}`}
              checked={selectedTypes.includes(licenseType)}
              onCheckedChange={(checked) => handleCheckboxChange(licenseType, checked)}
              className="data-[state=checked]:bg-cyan-glow data-[state=checked]:border-cyan-glow border-neutral-600 focus-visible:ring-cyan-glow"
            />
            <Label 
              htmlFor={`license-${licenseType}`}
              className="text-sm font-normal text-neutral-200 capitalize cursor-pointer"
            >
              {licenseType.toLowerCase()} {/* Display nicely */}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
} 