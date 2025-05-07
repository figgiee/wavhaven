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

// TODO: Replace with actual Prisma generated type if possible
// If Prisma types are used directly, ensure only necessary fields are passed
// to avoid leaking sensitive data to the client.
export interface License {
  id: string;
  type: string; // e.g., 'Basic', 'Premium', 'Exclusive'
  name?: string | null; // Adding name as an alternative to type
  price: number;
  description?: string | null;
  // Add any other relevant fields needed for display
}

interface LicenseSelectorProps {
  licenses: License[];
  trackId: string; // Keep for context if needed, but not for cart actions
  trackTitle: string; // Keep for context
  producerName: string; // Keep for context
  imageUrl?: string; // Keep for context
  selectedLicenseId: string | undefined; // Added prop
  onLicenseChange: (id: string | undefined) => void; // Added prop
}

export function LicenseSelector({
  licenses,
  trackId,
  trackTitle,
  producerName,
  imageUrl,
  selectedLicenseId, // Use prop
  onLicenseChange,   // Use prop
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
    return <p className="text-muted-foreground">No licenses available for this track.</p>;
  }

  return (
    <div className="space-y-4">
      <RadioGroup
        value={selectedLicenseId} // Use prop value
        onValueChange={onLicenseChange} // Use prop handler
        className="space-y-3"
      >
        {licenses.map((license) => (
          <div 
            key={license.id} 
            className="flex items-center space-x-3 rounded-md border p-4 hover:bg-accent/50 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/10"
          >
            <RadioGroupItem value={license.id} id={license.id} />
            <Label htmlFor={license.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full cursor-pointer">
              <div className="flex items-baseline mb-1 sm:mb-0">
                  <span className="font-medium text-base mr-2">{license.name || license.type}</span>
                  <span className="text-base text-muted-foreground font-semibold">
                      {formatPrice(license.price)}
                  </span>
              </div>
              {license.description && (
                  <span className="text-sm text-muted-foreground sm:ml-4">{license.description}</span>
              )}
            </Label>
          </div>
        ))}
      </RadioGroup>

      {/* --- REMOVED Conditional Button --- */}
      {/* <Button ... /> */}
    </div>
  );
} 