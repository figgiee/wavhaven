'use client';

import React, { useState, useMemo } from 'react';
import { usePostHog } from 'posthog-js/react';
// import { useAuth } from "@clerk/nextjs"; // Removed if only used for cart actions
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
// import { Button } from "@/components/ui/button"; // Removed Button import
// import { useCartStore, CartItem } from '@/stores/cartStore'; // Removed store import
// import { toast } from 'sonner'; // Removed toast import
import { formatPrice } from '@/lib/utils';
// import { ShoppingCart, Trash2 } from 'lucide-react'; // Removed icon imports
import type { License as DetailedLicense } from '@/components/license/license.types'; // Import the detailed type
import { cn } from '@/lib/utils'; // Import cn
import { CheckCircle2 } from 'lucide-react'; // For custom check indicator

// Remove local License interface, will use DetailedLicense
// export interface License {
//   id: string;
//   type: string; // e.g., 'Basic', 'Premium', 'Exclusive'
//   name?: string | null; // Adding name as an alternative to type
//   price: number;
//   description?: string | null;
//   // Add any other relevant fields needed for display
// }

interface LicenseSelectorProps {
  licenses: DetailedLicense[]; // Use DetailedLicense type
  trackId: string; 
  trackTitle: string; 
  producerName: string; 
  imageUrl?: string; 
  selectedLicenseId: string | undefined; 
  onLicenseChange: (id: string | undefined) => void; 
}

export function LicenseSelector({
  licenses,
  trackId,
  trackTitle,
  producerName,
  imageUrl,
  selectedLicenseId, 
  onLicenseChange,   
}: LicenseSelectorProps) {
  // REMOVED internal state for selectedLicenseId
  // const [selectedLicenseId, setSelectedLicenseId] = useState<string | undefined>(...

  // REMOVED cart hooks and related logic
  // const { items, addItem, removeItem } = useCartStore();
  // const posthog = usePostHog();
  // const { isSignedIn } = useAuth();
  // const isInCart = useMemo(...);
  // const handleCartAction = () => { ... };

  if (!licenses || licenses.length === 0) {
    return <p className="text-center text-neutral-500 py-8">No licenses available for this track.</p>;
  }

  return (
    <div className="space-y-3 sm:space-y-4 p-1"> {/* Added p-1 to allow focus rings to show fully */}
      <RadioGroup
        value={selectedLicenseId}
        onValueChange={onLicenseChange}
        className="space-y-3 sm:space-y-4"
        aria-label="Select a license"
      >
        {licenses.map((license) => {
          const isSelected = selectedLicenseId === license.id;
          return (
            <div 
              key={license.id} 
              className={cn(
                "rounded-lg border-2 p-4 transition-all duration-200 ease-in-out cursor-pointer",
                "bg-neutral-800/50 border-neutral-700/70 hover:border-neutral-600",
                isSelected 
                  ? "border-cyan-glow shadow-glow-cyan-md ring-2 ring-cyan-glow/70 bg-cyan-glow/10"
                  : "hover:bg-neutral-700/40",
                "focus-within:ring-2 focus-within:ring-cyan-glow focus-within:border-cyan-glow/70" // Ring on focus within
              )}
            >
              <Label htmlFor={license.id} className="flex flex-col sm:flex-row sm:items-start w-full cursor-pointer">
                <div className="flex items-center mb-2 sm:mb-0 sm:mr-4 shrink-0">
                  <RadioGroupItem 
                    value={license.id} 
                    id={license.id} 
                    className={cn(
                        "border-neutral-600 data-[state=checked]:border-cyan-glow data-[state=checked]:bg-cyan-glow text-cyan-glow focus-visible:ring-cyan-glow/50 shrink-0 w-5 h-5",
                        // Hide default radio item, we'll use the outer div state or a custom check icon
                        // "opacity-0 absolute left-[-9999px]"
                    )}
                   />
                   {/* Custom check indicator if radio is hidden */}
                   {/* {isSelected && <CheckCircle2 className="w-5 h-5 text-cyan-glow absolute top-4 right-4" />} */}
                </div>
                <div className="flex-grow">
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between mb-1">
                    <span className={cn(
                        "font-semibold text-base sm:text-lg mr-2 transition-colors", 
                        isSelected ? "text-cyan-glow" : "text-neutral-100"
                    )}>
                        {license.name || license.type}
                    </span>
                    <span className={cn(
                        "text-base sm:text-lg font-bold transition-colors", 
                        isSelected ? "text-cyan-glow" : "text-neutral-300"
                    )}>
                        {formatPrice(license.price)}
                    </span>
                  </div>
                  {/* Displaying some key features from DetailedLicense.features */}
                  {license.features && license.features.length > 0 && (
                    <ul className="list-disc list-inside space-y-0.5 pl-1 mt-1.5">
                      {license.features.slice(0, 3).map((feature, index) => (
                        <li key={index} className={cn(
                            "text-xs transition-colors",
                            isSelected ? "text-cyan-glow/80" : "text-neutral-400"
                        )}>
                          {feature.text}
                        </li>
                      ))}
                      {license.features.length > 3 && (
                        <li className={cn("text-xs italic", isSelected ? "text-cyan-glow/70" : "text-neutral-500")}>...and more</li>
                      )}
                    </ul>
                  )}
                  {/* Fallback if no features but description exists */}
                  {!license.features && license.description && (
                     <p className={cn(
                         "text-xs mt-1.5 transition-colors",
                         isSelected ? "text-cyan-glow/80" : "text-neutral-400"
                        )}>
                        {license.description.substring(0,100)}{license.description.length > 100 && '...'}
                     </p>
                  )}
                </div>
              </Label>
            </div>
          );
        })}
      </RadioGroup>

      {/* --- REMOVED Conditional Button --- */}
      {/* <Button ... /> */}
    </div>
  );
} 