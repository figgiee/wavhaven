import { Metadata } from 'next';
import { CheckoutClientPage } from '@/components/checkout/CheckoutClientPage';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Container } from '@/components/ui/container';

export const metadata: Metadata = {
  title: 'Checkout - WavHaven',
  description: 'Review your order and complete your purchase.',
};

const breadcrumbItems = [
  { label: 'Home', href: '/' },
  { label: 'Cart', href: '/cart' },
  { label: 'Checkout', isCurrent: true },
];

export default function CheckoutPage() {
  return (
    <Container className="py-8 md:py-12">
      <Breadcrumbs items={breadcrumbItems} />
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>
      <p className="text-muted-foreground mb-8">
        Please review your order and provide your billing information.
      </p>
      <CheckoutClientPage />
    </Container>
  );
} 