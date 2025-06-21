import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy | Wavhaven',
  description: 'Wavhaven Cookie Policy',
};

export default function CookiesPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Wavhaven Cookie Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last Updated: {/* [Date] */}</p>

      <p className="mb-4">
        This Cookie Policy explains how {/* [Your Company Name] */} (&quot;Wavhaven,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) uses cookies and similar tracking technologies when you visit our website and use our services (collectively, the &quot;Platform&quot;). It explains what these technologies are and why we use them, as well as your rights to control our use of them.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">1. What Are Cookies?</h2>
      <p className="mb-4">
        Cookies are small data files placed on your computer or mobile device when you visit a website. Cookies are widely used by website owners to make their websites work, or to work more efficiently, as well as to provide reporting information.
      </p>
      <p className="mb-6">
        Cookies set by the website owner (in this case, Wavhaven) are called &quot;first-party cookies.&quot; Cookies set by parties other than the website owner are called &quot;third-party cookies.&quot; Third-party cookies enable third-party features or functionality to be provided on or through the website (e.g., analytics, payment processing).
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">2. Why We Use Cookies</h2>
      <p className="mb-4">We use first-party and third-party cookies for several reasons:</p>
      <ul className="list-disc list-inside mb-6 space-y-3">
        <li>
          <strong>Strictly Necessary Cookies:</strong> These cookies are essential for the Platform to function correctly. They enable core functionalities like user authentication (logging in), maintaining your session, securing the site, and managing your shopping cart. You cannot refuse these cookies without impacting how the Platform functions.
        </li>
        <li>
          <strong>Performance and Analytics Cookies:</strong> These cookies collect information about how you use our Platform, such as which pages you visit most often and if you encounter error messages. This helps us improve how the Platform works. We use services like {/* [e.g., Google Analytics, PostHog] */} for this purpose. The information collected is typically aggregated and anonymized.
        </li>
        <li>
          <strong>Functionality Cookies:</strong> These cookies allow the Platform to remember choices you make (such as your username, language, or region) and provide enhanced, more personal features. For example, they might remember your login state or user preferences.
        </li>
        {/* Optional Section - Modify or remove based on actual usage */}
        <li>
          <strong>Targeting/Advertising Cookies:</strong> {/* [If NOT used:] */} Wavhaven does not currently use targeting or advertising cookies to track your activity across other websites or deliver personalized advertisements. {/* [If USED: "These cookies are used to deliver advertisements more relevant to you and your interests. They may be set by us or by advertising partners. They remember that you have visited a website and this information might be shared with other organizations such as advertisers."] */}
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4">3. Types of Cookies We Use (Examples)</h2>
      <ul className="list-disc list-inside mb-6 space-y-2">
        <li><strong>Session Cookies:</strong> Temporary cookies that expire when you close your browser. Used for essential functions like login status and cart management.</li>
        <li><strong>Persistent Cookies:</strong> Remain on your device for a set period or until you delete them. Used for remembering preferences or login details.</li>
        <li><strong>First-Party Cookies:</strong> Set directly by Wavhaven for core functionality.</li>
        <li><strong>Third-Party Cookies:</strong> Set by our service providers (e.g., Google Analytics for analytics, Stripe for payment processing).</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4">4. Third-Party Cookies</h2>
      <p className="mb-4">We use the following third-party services that may set cookies on your device:</p>
      <ul className="list-disc list-inside mb-6 space-y-2">
        <li><strong>[e.g., Clerk]:</strong> For user authentication and session management. {/* [Link to Clerk's Privacy/Cookie Policy] */}</li>
        <li><strong>[e.g., Stripe]:</strong> For secure payment processing. {/* [Link to Stripe's Privacy/Cookie Policy] */}</li>
        <li><strong>[e.g., Google Analytics]:</strong> To understand how users interact with the Platform. Data is generally aggregated and anonymized. {/* [Link to Google's Privacy/Cookie Policy and Opt-Out] */}</li>
        <li><strong>[e.g., PostHog]:</strong> For product analytics and understanding user behavior within the platform. {/* [Link to PostHog's Privacy/Cookie Policy] */}</li>
        {/* [List any other relevant third parties, e.g., Customer Support Chat] */}
      </ul>
       <p className="mb-6">We do not control these third-party cookies. Please review their respective policies for more information.</p>

       <h2 className="text-2xl font-semibold mt-8 mb-4">5. Your Choices: Managing Cookies</h2>
       <p className="mb-4">You have the right to decide whether to accept or reject cookies (other than strictly necessary ones).</p>
       <ul className="list-disc list-inside mb-6 space-y-3">
        <li>
          <strong>Cookie Consent Banner:</strong> When you first visit our Platform, you may be presented with a cookie consent banner allowing you to manage your preferences.
        </li>
        <li>
          <strong>Browser Settings:</strong> Most web browsers allow you to control cookies through their settings preferences. You can usually set your browser to refuse cookies or to alert you when cookies are being sent. Follow the instructions provided by your browser (usually located within the &quot;Help,&quot; &quot;Tools,&quot; or &quot;Edit&quot; settings). Useful links for major browsers:
          <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
            <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Chrome</a></li>
            <li><a href="https://support.mozilla.org/en-US/kb/enable-and-disable-cookies-website-preferences" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Mozilla Firefox</a></li>
            <li><a href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Apple Safari</a></li>
            <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Microsoft Edge</a></li>
          </ul>
        </li>
        <li>
          <strong>Consequences of Disabling:</strong> Please note that if you choose to disable cookies, some parts of our Platform may not function properly or may become inaccessible. Strictly necessary cookies cannot be disabled if you wish to use the Platform.
        </li>
      </ul>

       <h2 className="text-2xl font-semibold mt-8 mb-4">6. Changes to This Cookie Policy</h2>
      <p className="mb-6">
        We may update this Cookie Policy from time to time to reflect changes in technology, legislation, or our practices. We will notify you of significant changes by posting the updated policy on the Platform and updating the &quot;Last Updated&quot; date.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">7. Contact Us</h2>
      <p className="mb-6">
        If you have any questions about our use of cookies, please contact us at:
        <br />
        <Link href="/support" className="text-primary hover:underline">
          Support {/* [Link to /support] */}
        </Link>{' '}
         or {/* [Your Privacy Email Address] */}
      </p>

       <p className="mt-12 text-sm text-muted-foreground italic">
        <strong>Legal Disclaimer:</strong> This document is provided for informational purposes. Consult with a legal professional to ensure it meets your specific needs and complies with applicable laws regarding cookies and tracking technologies.
      </p>
    </div>
  );
} 