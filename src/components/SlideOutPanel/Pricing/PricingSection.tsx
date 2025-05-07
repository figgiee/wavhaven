import React from 'react';
import { LicenseItem } from './LicenseItem';
import type { AdaptedBeatData } from '../SlideOutPanel';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCartStore } from '@/stores/use-cart-store';
import type { CartItem } from '@/stores/use-cart-store';
import { toast } from 'sonner';

interface PricingSectionProps {
  beat: AdaptedBeatData;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ beat }) => {
  const addItemToCart = useCartStore((state) => state.addItem);

  const handleAddToCart = (licenseId: string) => {
    const licenseToAdd = beat.licenses.find(l => l.id === licenseId);

    if (!licenseToAdd) {
      console.error(`Could not find license with ID ${licenseId} for beat ${beat.id}`);
      toast.error('Something went wrong adding the license to the cart.');
      return;
    }

    const cartItem: CartItem = {
        id: beat.id,
        licenseId: licenseToAdd.id,
        title: beat.title,
        artist: beat.producer.name,
        price: licenseToAdd.price,
        imageUrl: beat.artworkUrl,
        licenseType: licenseToAdd.name,
        trackTitle: beat.title,
        producerName: beat.producer.name,
    };

    addItemToCart(cartItem);

    toast.success(`${beat.title} (${licenseToAdd.name}) added to cart!`);
  };

  return (
    <Card className="bg-gray-800 border-gray-700 text-white">
      <CardHeader className="p-4">
        <CardTitle className="text-lg font-medium text-white">Pricing and Licenses</CardTitle>
      </CardHeader>
      <Separator className="bg-gray-700" />
      <CardContent className="p-6">
        {beat.isForSale && beat.licenses && beat.licenses.length > 0 ? (
          <ul className="space-y-3">
            {beat.licenses.map(license => (
              <LicenseItem
                key={license.id}
                license={license}
                onAddToCart={handleAddToCart}
              />
            ))}
          </ul>
        ) : (
          <div className="text-gray-400 text-center py-8">
            {beat.title} is not currently available for sale.
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 