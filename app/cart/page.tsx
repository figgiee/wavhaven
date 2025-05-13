import React from 'react';
import { Separator } from '@/components/ui/separator';
import { Metadata } from 'next';
import { CartClientContent } from '@/components/cart/CartClientContent'; // Import the new client component
import { Container } from '@/components/layout/Container';

export const metadata: Metadata = {
  title: 'Shopping Cart - Wavhaven',
  description: 'Review the items in your shopping cart and proceed to checkout.',
};

// Removed mock data and event handlers - they are now in CartClientContent

const CartPage: React.FC = () => {
  return (
    <Container className="py-8 md:py-12">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
      <Separator className="mb-8 bg-border" />

      {/* Render the client component containing the interactive content */}
      <CartClientContent />

    </Container>
  );
};

export default CartPage; 