'use client';

import React, { useState, useMemo } from 'react';
import { usePostHog } from 'posthog-js/react';
// import { useAuth } from "@clerk/nextjs"; // Removed if only used for cart actions
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
// import { useCartStore, CartItem } from '@/stores/cartStore'; // Removed store import
// import { toast } from 'sonner'; // Removed toast import
import { formatPrice } from '@/lib/utils';
// import { ShoppingCart, Trash2 } from 'lucide-react'; // Removed icon imports
import { cn } from '@/lib/utils'; // Import cn
import { CheckCircle2, ShoppingCart } from 'lucide-react'; // For custom check indicator and ShoppingCart

// Use the actual License type from Prisma instead of DetailedLicense
interface PrismaLicense {
  id: string;
  type: string;
  name: string;
  price: number; // Already converted from Decimal
  description?: string | null;
  filesIncluded?: string[]; // TrackFileType[] as strings
  streamLimit?: number | null;
  distributionLimit?: number | null;
  radioStations?: number | null;
  musicVideos?: number | null;
}

interface LicenseSelectorProps {
  licenses: PrismaLicense[];
  trackId: string; 
  trackTitle: string; 
  producerName: string; 
  imageUrl?: string; 
  onLicenseSelect?: (license: PrismaLicense) => void; // Callback when user selects and confirms a license
}

export function LicenseSelector({
  licenses,
  trackId,
  trackTitle,
  producerName,
  imageUrl,
  onLicenseSelect,   
}: LicenseSelectorProps) {
  const [selectedLicenseId, setSelectedLicenseId] = useState<string | undefined>(undefined);
  
  // REMOVED cart hooks and related logic
  // const { items, addItem, removeItem } = useCartStore();
  // const posthog = usePostHog();
  // const { isSignedIn } = useAuth();
  // const isInCart = useMemo(...);
  // const handleCartAction = () => { ... };

  if (!licenses || licenses.length === 0) {
    return <p className="text-center text-neutral-500 py-8">No licenses available for this track.</p>;
  }

  // Helper function to generate feature list from license data
  const generateFeatures = (license: PrismaLicense): string[] => {
    const features: string[] = [];
    
    if (license.filesIncluded && license.filesIncluded.length > 0) {
      features.push(`Files: ${license.filesIncluded.join(', ')}`);
    }
    
    if (license.streamLimit) {
      features.push(`${license.streamLimit.toLocaleString()} streams`);
    }
    
    if (license.distributionLimit) {
      features.push(`${license.distributionLimit.toLocaleString()} distributions`);
    }
    
    if (license.radioStations) {
      features.push(`${license.radioStations} radio stations`);
    }
    
    if (license.musicVideos) {
      features.push(`${license.musicVideos} music videos`);
    }
    
    return features;
  };

  const selectedLicense = selectedLicenseId ? licenses.find(l => l.id === selectedLicenseId) : undefined;

  const handlePurchase = () => {
    if (selectedLicense && onLicenseSelect) {
      onLicenseSelect(selectedLicense);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3 sm:space-y-4 p-1">
        <RadioGroup
          value={selectedLicenseId}
          onValueChange={setSelectedLicenseId}
          className="space-y-3 sm:space-y-4"
          aria-label="Select a license"
        >
          {licenses.map((license) => {
            const isSelected = selectedLicenseId === license.id;
            const features = generateFeatures(license);
            
            return (
              <div 
                key={license.id} 
                className={cn(
                  "rounded-lg border-2 p-4 transition-all duration-200 ease-in-out cursor-pointer",
                  "bg-neutral-800/50 border-neutral-700/70 hover:border-neutral-600",
                  isSelected 
                    ? "border-cyan-glow shadow-glow-cyan-md ring-2 ring-cyan-glow/70 bg-cyan-glow/10"
                    : "hover:bg-neutral-700/40",
                  "focus-within:ring-2 focus-within:ring-cyan-glow focus-within:border-cyan-glow/70"
                )}
              >
                <Label htmlFor={license.id} className="flex flex-col sm:flex-row sm:items-start w-full cursor-pointer">
                  <div className="flex items-center mb-2 sm:mb-0 sm:mr-4 shrink-0">
                    <RadioGroupItem 
                      value={license.id} 
                      id={license.id} 
                      className={cn(
                          "border-neutral-600 data-[state=checked]:border-cyan-glow data-[state=checked]:bg-cyan-glow text-cyan-glow focus-visible:ring-cyan-glow/50 shrink-0 w-5 h-5"
                      )}
                     />
                  </div>
                  <div className="flex-grow">
                    <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between mb-1">
                      <span className={cn(
                          "font-semibold text-base sm:text-lg mr-2 transition-colors", 
                          isSelected ? "text-cyan-glow" : "text-neutral-100"
                      )}>
                          {license.name}
                      </span>
                      <span className={cn(
                          "text-base sm:text-lg font-bold transition-colors", 
                          isSelected ? "text-cyan-glow" : "text-neutral-300"
                      )}>
                          {formatPrice(license.price)}
                      </span>
                    </div>
                    
                    {/* Display features generated from license data */}
                    {features.length > 0 && (
                      <ul className="list-disc list-inside space-y-0.5 pl-1 mt-1.5">
                        {features.slice(0, 3).map((feature, index) => (
                          <li key={index} className={cn(
                              "text-xs transition-colors",
                              isSelected ? "text-cyan-glow/80" : "text-neutral-400"
                          )}>
                            {feature}
                          </li>
                        ))}
                        {features.length > 3 && (
                          <li className={cn("text-xs italic", isSelected ? "text-cyan-glow/70" : "text-neutral-500")}>...and more</li>
                        )}
                      </ul>
                    )}
                    
                    {/* Fallback to description if no features */}
                    {features.length === 0 && license.description && (
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
      </div>

      {/* Purchase Button */}
      {selectedLicense && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={handlePurchase}
            size="lg"
            className="bg-cyan-glow hover:bg-cyan-glow/90 text-black font-semibold px-8 py-3 rounded-lg transition-all duration-200"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            Purchase {selectedLicense.name} - {formatPrice(selectedLicense.price)}
          </Button>
        </div>
      )}
    </div>
  );
} 