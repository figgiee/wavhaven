import React from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import type { License } from '@/types';
import { formatPrice } from '@/lib/utils'; // Assuming a price formatting utility

interface LicenseItemProps {
  license: License;
  onAddToCart: (licenseId: string) => void;
}

// Placeholder for formatPrice if it doesn't exist
// const formatPrice = (price: number): string => {
//   return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
// };

export const LicenseItem: React.FC<LicenseItemProps> = ({ license, onAddToCart }) => {
  const handleAddToCartClick = () => {
    onAddToCart(license.id);
  };

  return (
    <li className="flex items-center justify-between gap-4 p-3 bg-gray-800 hover:bg-gray-700 rounded transition-colors">
      <div className="flex-grow">
        <h5 className="font-medium text-white">{license.name}</h5>
        <p className="text-sm text-gray-400">{license.description}</p>
      </div>
      <div className="flex-shrink-0">
        <Button
          size="sm"
          onClick={handleAddToCartClick}
          aria-label={`Add ${license.name} to cart for ${formatPrice(license.price)}`}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          <ShoppingCartIcon className="h-4 w-4 mr-2" />
          {formatPrice(license.price)}
        </Button>
      </div>
    </li>
  );
}; 