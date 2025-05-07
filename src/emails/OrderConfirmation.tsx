import * as React from 'react';
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

// Define the props expected by the email component
interface OrderConfirmationEmailProps {
  orderId: string;
  orderDate: Date;
  items: { trackTitle: string; licenseType: string; price: number }[];
  totalPrice: number;
  downloadLinks: string[];
  customerName?: string; // Optional name
}

// Helper function for formatting price (assuming cents)
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price / 100);
};

export const OrderConfirmationEmail = ({
  orderId,
  orderDate,
  items,
  totalPrice,
  downloadLinks,
  customerName = 'there', // Default if no name provided
}: OrderConfirmationEmailProps) => {
  const previewText = `Your Wavhaven Order Confirmation (#${orderId})`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Thanks for your order, {customerName}!</Heading>
          <Text style={paragraph}>Order ID: {orderId}</Text>
          <Text style={paragraph}>Order Date: {orderDate.toLocaleDateString()}</Text>
          
          <Section>
            <Heading as="h2" style={subheading}>Order Summary</Heading>
            {items.map((item, idx) => (
              <Text key={idx} style={listItem}>
                - {item.trackTitle} ({item.licenseType}): {formatPrice(item.price)}
              </Text>
            ))}
            <Hr style={hr} />
            <Text style={total}>Total: {formatPrice(totalPrice)}</Text>
          </Section>

          <Section style={downloadSection}>
            <Heading as="h2" style={subheading}>Your Downloads</Heading>
            <Text style={paragraph}>
              Click the links below to download your purchased files. These links expire, so please download them soon.
            </Text>
            {downloadLinks.map((link, idx) => (
              <Button key={idx} style={button} href={link}>
                Download File {idx + 1}
              </Button>
            ))}
          </Section>

          <Hr style={hr} />
          <Text style={footer}>Wavhaven - Your Music Licensing Marketplace</Text>
        </Container>
      </Body>
    </Html>
  );
};

export default OrderConfirmationEmail;

// Basic styles (can be expanded)
const main = {
  backgroundColor: "#ffffff",
  fontFamily: '\'HelveticaNeue-Light\', \'Helvetica Neue Light\', \'Helvetica Neue\', Helvetica, Arial, \'Lucida Grande\', sans-serif',
  fontWeight: 300,
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
  width: "580px",
};

const heading = {
  fontSize: "32px",
  lineHeight: "1.3",
  fontWeight: 700,
  color: "#484848",
};

const subheading = {
  fontSize: "24px",
  lineHeight: "1.3",
  fontWeight: 600,
  color: "#484848",
  marginTop: '20px',
  marginBottom: '10px',
};

const paragraph = {
  fontSize: "18px",
  lineHeight: "1.4",
  color: "#484848",
};

const listItem = {
  ...paragraph,
  paddingLeft: '10px',
}

const total = {
  ...paragraph,
  fontWeight: 700,
  marginTop: '10px',
}

const downloadSection = {
  marginTop: '20px',
};

const button = {
  backgroundColor: "#007bff", // Example blue button
  borderRadius: "3px",
  color: "#fff",
  fontSize: "18px",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px",
  margin: "10px 0",
};

const hr = {
  borderColor: "#cccccc",
  margin: "20px 0",
};

const footer = {
  color: "#9ca299",
  fontSize: "14px",
  marginTop: "20px",
  marginBottom: "10px",
}; 