import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Wavhaven',
  description: 'Wavhaven Privacy Policy',
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Wavhaven Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last Updated: {/* [Date] */}</p>

      <p className="mb-4">
        {/* [Your Company Name] */} (&quot;Wavhaven,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use the Wavhaven website, services, and marketplace (collectively, the &quot;Platform&quot;).
      </p>

      <p className="mb-6">
        Please read this Privacy Policy carefully. By using the Platform, you agree to the terms of this Privacy Policy. If you do not agree, please do not access or use the Platform.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">1. Information We Collect</h2>
      <p className="mb-4">We may collect information about you in various ways:</p>
      <ul className="list-disc list-inside mb-6 space-y-4">
        <li>
          <strong>Personal Data You Provide:</strong>
          <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
            <li><strong>Account Information:</strong> When you register, we collect information like your name, email address, username, and password. Producers may provide additional profile information (store name, bio, payout details).</li>
            <li><strong>Payment Information:</strong> When you make a purchase, our third-party payment processor ({/* [e.g., Stripe] */}) collects your payment card details. Wavhaven does not directly store your full payment card information, though we may receive transaction identifiers and summaries.</li>
            <li><strong>Communications:</strong> If you contact us directly (e.g., support requests), we may collect your name, email address, and the content of your communications.</li>
          </ul>
        </li>
        <li>
          <strong>Usage Data:</strong>
          <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
            <li><strong>Log Files:</strong> Like many websites, we collect information automatically, such as your IP address, browser type, operating system, referring URLs, pages visited, and timestamps.</li>
            <li><strong>Device Information:</strong> We may collect information about the device you use to access the Platform, such as hardware model, operating system version, and unique device identifiers.</li>
            <li>
              <strong>Cookies and Tracking Technologies:</strong> We use cookies, web beacons, and similar technologies to collect information about your interaction with the Platform. Please see our{' '}
              <Link href="/cookies" className="text-primary hover:underline">
                Cookie Policy {/* [Link to Cookie Policy] */}
              </Link> for more details.
            </li>
          </ul>
        </li>
        <li>
          <strong>Content Information:</strong>
          <p className="ml-6 mt-1">We collect the Content (audio files, presets, etc.) and associated metadata (title, BPM, key, tags, descriptions, artwork) that Producers upload to the Platform.</p>
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4">2. How We Use Your Information</h2>
      <p className="mb-4">We use the information we collect for various purposes, including:</p>
      <ul className="list-disc list-inside mb-6 space-y-2">
        <li>To provide, operate, maintain, and improve the Platform.</li>
        <li>To process transactions and fulfill orders (including providing license details and download access).</li>
        <li>To facilitate payouts to Producers.</li>
        <li>To create and manage your account.</li>
        <li>To communicate with you, including responding to inquiries, sending service announcements, and (with your consent) marketing emails.</li>
        <li>To personalize your experience on the Platform (e.g., showing relevant content).</li>
        <li>To monitor and analyze trends, usage, and activities in connection with the Platform.</li>
        <li>To detect, investigate, and prevent fraudulent transactions and other illegal activities and protect the rights and property of Wavhaven and others.</li>
        <li>To comply with legal obligations.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4">3. How We Share Your Information</h2>
      <p className="mb-4">We may share your information in the following situations:</p>
       <ul className="list-disc list-inside mb-6 space-y-3">
        <li>
          <strong>With Service Providers:</strong> We share information with third-party vendors and service providers who perform services on our behalf, such as payment processing (Stripe), website hosting, data analysis, email delivery, and customer support. These providers only have access to the information necessary to perform their functions and are obligated to protect your information.
        </li>
        <li>
          <strong>With Producers:</strong> If you purchase a license, we may share necessary transaction details (like Order ID, license type purchased, date, but typically <em>not</em> your full name or direct contact unless required for specific license fulfillment) with the relevant Producer for their sales records and license tracking.
        </li>
        <li>
          <strong>For Legal Reasons:</strong> We may disclose your information if required by law, subpoena, or other legal process, or if we believe in good faith that disclosure is necessary to protect our rights, protect your safety or the safety of others, investigate fraud, or respond to a government request.
        </li>
        <li>
          <strong>Business Transfers:</strong> In connection with any merger, sale of company assets, financing, or acquisition of all or a portion of our business by another company, your information may be transferred as part of that transaction.
        </li>
        <li>
          <strong>With Your Consent:</strong> We may share your information for other purposes with your explicit consent.
        </li>
      </ul>
      <p className="mb-6 font-semibold">We do not sell your personal information to third parties.</p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">4. Data Security</h2>
      <p className="mb-6">
        We implement reasonable administrative, technical, and physical security measures designed to protect your information from unauthorized access, use, alteration, or destruction. However, please be aware that no security measures are perfect or impenetrable, and we cannot guarantee absolute security.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">5. Data Retention</h2>
      <p className="mb-6">
        We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law (such as for tax, accounting, or other legal requirements). When we have no ongoing legitimate business need to process your personal information, we will either delete or anonymize it.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">6. Your Rights and Choices</h2>
      <p className="mb-4">Depending on your location, you may have certain rights regarding your personal information:</p>
       <ul className="list-disc list-inside mb-6 space-y-2">
        <li><strong>Access:</strong> You may have the right to request access to the personal information we hold about you.</li>
        <li><strong>Correction:</strong> You may have the right to request correction of inaccurate information.</li>
        <li><strong>Deletion:</strong> You may have the right to request deletion of your personal information, subject to certain exceptions.</li>
        <li><strong>Opt-Out:</strong> You can opt-out of receiving promotional emails from us by following the unsubscribe instructions in those emails. You may not be able to opt-out of essential service-related communications.</li>
        <li>
          <strong>Cookie Choices:</strong> You can manage your cookie preferences as described in our{' '}
          <Link href="/cookies" className="text-primary hover:underline">
             Cookie Policy {/* [Link to Cookie Policy] */}
          </Link>.
        </li>
      </ul>
      <p className="mb-6">
         To exercise these rights, please contact us using the information below. {/* [Consider adding details specific to GDPR/CCPA rights if applicable, after legal review] */}
      </p>

       <h2 className="text-2xl font-semibold mt-8 mb-4">7. Third-Party Links</h2>
      <p className="mb-6">
        The Platform may contain links to other websites or services not operated or controlled by Wavhaven. This Privacy Policy does not apply to third-party services. We encourage you to review the privacy policies of any third-party service before providing information to them.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">8. Children&apos;s Privacy</h2>
      <p className="mb-6">
        The Platform is not intended for children under the age of {/* [e.g., 13 or 16, check regulations] */}. We do not knowingly collect personal information from children under this age. If we become aware that we have collected such information, we will take steps to delete it.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">9. International Data Transfers</h2>
      <p className="mb-6">
        Your information may be transferred to, and maintained on, computers located outside of your state, province, country, or other governmental jurisdiction where the privacy laws may not be as protective as those in your jurisdiction. If you are located outside the United States and choose to provide information to us, please note that we transfer the data, including Personal Data, to the United States and process it there. {/* [Modify based on actual hosting/processing locations and add details on transfer mechanisms like Standard Contractual Clauses if needed after legal review] */}
      </p>

       <h2 className="text-2xl font-semibold mt-8 mb-4">10. Changes to This Privacy Policy</h2>
      <p className="mb-6">
        We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last Updated&quot; date. We encourage you to review this Privacy Policy periodically.
      </p>

       <h2 className="text-2xl font-semibold mt-8 mb-4">11. Contact Us</h2>
       <p className="mb-6">
        If you have any questions about this Privacy Policy, please contact us at:
        <br />
        <Link href="/support" className="text-primary hover:underline">
          Support {/* [Link to /support] */}
        </Link>{' '}
        or {/* [Your Privacy Email Address, e.g., privacy@wavhaven.com] */}
      </p>

      <p className="mt-12 text-sm text-muted-foreground italic">
        <strong>Legal Disclaimer:</strong> This document is provided for informational purposes. Consult with a legal professional to ensure it meets your specific needs and complies with applicable privacy laws.
      </p>
    </div>
  );
} 