/** @jsxImportSource react */
// Add the above comment to enable JSX parsing in this .ts file

import { Resend } from 'resend';
import { render } from '@react-email/render';
import { OrderConfirmationEmail } from '@/emails/OrderConfirmation';

// Ensure RESEND_API_KEY is set in your .env file
const resendApiKey = process.env.RESEND_API_KEY;
// Ensure EMAIL_FROM_ADDRESS is set in your .env file (e.g., "Wavhaven <noreply@yourdomain.com>")
const emailFromAddress = process.env.EMAIL_FROM_ADDRESS;

if (!resendApiKey) {
  console.warn(
    'RESEND_API_KEY environment variable not found. Email sending will be disabled.'
  );
}

if (!emailFromAddress) {
    console.warn(
        'EMAIL_FROM_ADDRESS environment variable not found. Defaulting may cause issues.'
    );
}

// Initialize Resend client only if the API key exists
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Placeholder type for Order Details - replace with actual structure later
interface OrderDetails {
  orderId: string;
  customerName?: string;
  items: { trackTitle: string; licenseType: string; price: number }[];
  totalPrice: number;
  orderDate: Date;
}

/**
 * Sends an order confirmation email with download links.
 * 
 * @param to Recipient email address.
 * @param orderDetails Details of the order.
 * @param downloadLinks Array of secure download URLs.
 * @returns Promise resolving when the email is sent or rejected.
 */
export async function sendOrderConfirmationEmail(
  to: string,
  orderDetails: OrderDetails,
  downloadLinks: string[]
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.error('Resend client not initialized. Cannot send email.');
    return { success: false, error: 'Email service not configured.' };
  }
  if (!emailFromAddress) {
    console.error('Email \'from\' address not configured. Cannot send email.');
    return { success: false, error: 'Email \'from\' address not configured.' };
  }

  const subject = `Your Wavhaven Order Confirmation (#${orderDetails.orderId})`;

  try {
    // Render the React Email component to an HTML string
    const emailHtml = render(
      <OrderConfirmationEmail 
        orderId={orderDetails.orderId}
        orderDate={orderDetails.orderDate}
        items={orderDetails.items}
        totalPrice={orderDetails.totalPrice}
        downloadLinks={downloadLinks}
        customerName={orderDetails.customerName}
      />
    );

    const { data, error } = await resend.emails.send({
      from: emailFromAddress,
      to: [to],
      subject: subject,
      html: emailHtml,
    });

    if (error) {
      console.error('Error sending email via Resend:', error);
      return { success: false, error: error.message };
    }

    console.log('Order confirmation email sent successfully:', data?.id);
    return { success: true };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error: String(error) };
  }
}

// Note: Removed the local formatPrice function as it's now inside the email component
// If needed elsewhere, move it to a shared util file. 