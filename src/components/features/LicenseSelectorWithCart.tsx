'use client';

import { LicenseSelector } from '@/components/features/LicenseSelector';
import { useCartStore, CartItem } from '@/stores/useCartStore';

interface LicenseSelectorWithCartProps {
  track: {
    id: string;
    title: string;
    licenses: any[];
    coverImageUrl?: string | null;
  };
  sellerName: string;
}

export function LicenseSelectorWithCart({ track, sellerName }: LicenseSelectorWithCartProps) {
  const { addItem } = useCartStore();

  const handleLicenseSelect = (license: any) => {
    // Convert license to CartItem format
    const cartItem: CartItem = {
      trackId: track.id,
      licenseId: license.id,
      trackTitle: track.title,
      producerName: sellerName,
      imageUrl: track.coverImageUrl,
      licenseName: license.name,
      price: license.price
    };

    addItem(cartItem);
  };

  return (
    <LicenseSelector 
      licenses={track.licenses} 
      trackId={track.id} 
      trackTitle={track.title} 
      producerName={sellerName} 
      imageUrl={track.coverImageUrl}
      onLicenseSelect={handleLicenseSelect}
    />
  );
} 