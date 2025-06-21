import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Wavhaven',
  description: 'Wavhaven Terms of Service',
};

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Wavhaven Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-8">Last Updated: {/* [Date] */}</p>

      <p className="mb-4">
        Welcome to Wavhaven! These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Wavhaven website, services, and marketplace (collectively, the &quot;Platform&quot;) provided by {/* [Your Company Name] */} (&quot;Wavhaven,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
      </p>

      <p className="mb-6 font-semibold">
        PLEASE READ THESE TERMS CAREFULLY. BY ACCESSING OR USING THE PLATFORM, YOU AGREE TO BE BOUND BY THESE TERMS AND OUR{' '}
        <Link href="/privacy" className="text-primary hover:underline">
          Privacy Policy {/* [Link to Privacy Policy] */}
        </Link>
        . IF YOU DO NOT AGREE TO THESE TERMS, DO NOT USE THE PLATFORM.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">1. Definitions</h2>
      <ul className="list-disc list-inside mb-6 space-y-2">
        <li>
          <strong>Platform:</strong> The Wavhaven website, applications, and related services.
        </li>
        <li>
          <strong>User:</strong> Anyone who accesses or uses the Platform, including Producers and Customers.
        </li>
        <li>
          <strong>Producer:</strong> A User who uploads, lists, and licenses Content through the Platform.
        </li>
        <li>
          <strong>Customer:</strong> A User who browses, purchases licenses for, and downloads Content through the Platform.
        </li>
        <li>
          <strong>Content:</strong> Audio files (beats, loops, sound effects), sound kits, preset packs, associated metadata, artwork, and descriptions uploaded by Producers.
        </li>
        <li>
          <strong>License:</strong> The permission granted by a Producer to a Customer to use Content under specific terms and conditions, as selected by the Customer and defined on our{' '}
          {/* <Link href="/licensing-info" className="text-primary hover:underline"> */}
            Licensing Info {/* [Link to Licensing Info] */}
          {/* </Link> */}
          {' '}page and the specific product listing.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4">2. Platform Use</h2>
      <ul className="list-disc list-inside mb-6 space-y-3">
        <li>
          <strong>Eligibility:</strong> You must be at least {/* [e.g., 18] */} years old or the age of legal majority in your jurisdiction to use the Platform and create an account.
        </li>
        <li>
          <strong>Account:</strong> You may need to register for an account to access certain features. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use.
        </li>
        <li>
          <strong>Prohibited Conduct:</strong> You agree not to:
          <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
            <li>Violate any applicable laws or regulations.</li>
            <li>Infringe upon the intellectual property rights of others.</li>
            <li>Upload or distribute malicious software, viruses, or harmful code.</li>
            <li>Engage in fraudulent activities, including misrepresenting Content or licenses.</li>
            <li>Interfere with the operation of the Platform or other Users&apos; enjoyment of it.</li>
            <li>Scrape, data mine, or reverse engineer any part of the Platform.</li>
            <li>Use the Platform for any illegal or unauthorized purpose.</li>
          </ul>
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4">3. Producer Terms</h2>
      <ul className="list-disc list-inside mb-6 space-y-3">
        <li>
          <strong>Content Ownership:</strong> You retain full ownership and copyright of the Content you upload.
        </li>
        <li>
          <strong>License Grant to Wavhaven:</strong> By uploading Content, you grant Wavhaven a worldwide, non-exclusive, royalty-free license to host, display, market, sell licenses for, and distribute your Content through the Platform as necessary to provide our services.
        </li>
        <li>
          <strong>Warranties:</strong> You represent and warrant that:
          <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
            <li>You own or have all necessary rights, licenses, consents, and permissions to the Content you upload.</li>
            <li>Your Content does not infringe upon any third-party rights (including copyright, trademark, privacy, or publicity rights).</li>
            <li>Your Content complies with our {/* <Link href="/submission-guidelines" className="text-primary hover:underline"> */}Submission Guidelines{/* </Link> */} {/* [Link to Submission Guidelines] */} and does not contain any illegal, defamatory, or harmful material.</li>
            <li>You have obtained all necessary clearances for any samples used in your Content, as outlined in our {/* <Link href="/submission-guidelines" className="text-primary hover:underline"> */}Submission Guidelines{/* </Link> */} {/* [Link to Submission Guidelines] */}.</li>
          </ul>
        </li>
        <li>
          <strong>Responsibility:</strong> You are solely responsible for the Content you upload, including its accuracy, legality, and compliance with these Terms.
        </li>
        <li>
          <strong>Pricing & Licensing:</strong> You set the prices for the license types you choose to offer for your Content, subject to any platform guidelines or minimums.
        </li>
        <li>
          <strong>Takedowns:</strong> Wavhaven reserves the right to remove any Content that violates these Terms or our guidelines, or in response to a valid copyright takedown notice.
        </li>
      </ul>

       <h2 className="text-2xl font-semibold mt-8 mb-4">4. Customer Terms</h2>
       <ul className="list-disc list-inside mb-6 space-y-3">
        <li>
          <strong>Purchasing Licenses:</strong> When you purchase a license for Content, you are acquiring specific usage rights as defined by the selected license type (see {/* <Link href="/licensing-info" className="text-primary hover:underline"> */}Licensing Info{/* </Link> */} {/* [Link to Licensing Info] */}) and any additional terms specified by the Producer on the listing. You are not purchasing ownership of the Content&apos;s copyright.
        </li>
        <li>
          <strong>License Scope:</strong> You agree to use the Content strictly within the scope of the purchased license. Unauthorized use, sharing, resale of the raw Content, or exceeding license limitations is prohibited.
        </li>
        <li>
          <strong>Previews:</strong> Audio previews are provided for evaluation purposes only and may contain audible watermarks or tags. They may not be used in any final projects.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4">5. Payments, Fees, and Payouts</h2>
      <ul className="list-disc list-inside mb-6 space-y-3">
        <li>
          <strong>Pricing:</strong> Prices for licenses are set by Producers and displayed on the Platform.
        </li>
        <li>
          <strong>Payment Processing:</strong> Customer payments are processed through our third-party payment processor ({/* [e.g., Stripe] */}). By making a purchase, you agree to their terms and conditions. Wavhaven does not store your full payment card details.
        </li>
        <li>
          <strong>Commissions:</strong> Wavhaven charges Producers a commission fee on each successful license sale, as outlined in our {/* <Link href="/producer-faq" className="text-primary hover:underline"> */}Producer FAQ or separate fee schedule{/* </Link> */} {/* [Link to Producer FAQ or separate fee schedule] */}.
        </li>
        <li>
          <strong>Producer Payouts:</strong> Payouts to Producers are made according to the schedule and methods described in our {/* <Link href="/producer-faq" className="text-primary hover:underline"> */}Producer FAQ{/* </Link> */} {/* [Link to Producer FAQ] */}. Producers are responsible for providing accurate payout information and meeting any minimum payout thresholds.
        </li>
        <li>
          <strong>Taxes:</strong> Users are responsible for determining and paying any applicable taxes associated with their purchases or earnings on the Platform.
        </li>
      </ul>

       <h2 className="text-2xl font-semibold mt-8 mb-4">6. Intellectual Property</h2>
       <ul className="list-disc list-inside mb-6 space-y-3">
        <li>
          <strong>Wavhaven IP:</strong> The Platform itself, including its design, logos, trademarks, software, and underlying code, is the property of Wavhaven and its licensors and is protected by intellectual property laws.
        </li>
        <li>
          <strong>User Content IP:</strong> Producers retain ownership of their Content. Customers obtain license rights as described herein.
        </li>
        <li>
          <strong>Copyright Policy (DMCA):</strong> Wavhaven respects intellectual property rights. If you believe your copyright has been infringed, please follow the procedure outlined in our {/* <Link href="/dmca" className="text-primary hover:underline"> */}DMCA/Copyright Policy Page{/* </Link> */} {/* [Link to DMCA/Copyright Policy Page] */}.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4">7. Disclaimers</h2>
      <p className="mb-6">
        THE PLATFORM AND ALL CONTENT ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WAVHAVEN DOES NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE. WE DO NOT GUARANTEE THE QUALITY, ACCURACY, OR LEGALITY OF CONTENT UPLOADED BY PRODUCERS. YOUR USE OF THE PLATFORM AND CONTENT IS AT YOUR SOLE RISK.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">8. Limitation of Liability</h2>
      <p className="mb-6">
        TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, WAVHAVEN AND ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM (a) YOUR ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE THE PLATFORM; (b) ANY CONTENT OBTAINED FROM THE PLATFORM; OR (c) UNAUTHORIZED ACCESS, USE, OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT. IN NO EVENT SHALL WAVHAVEN&apos;S AGGREGATE LIABILITY EXCEED THE GREATER OF ONE HUNDRED U.S. DOLLARS (USD $100.00) OR THE AMOUNT YOU PAID WAVHAVEN, IF ANY, IN THE PAST SIX MONTHS FOR THE SERVICES GIVING RISE TO THE CLAIM.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">9. Indemnification</h2>
      <p className="mb-6">
        You agree to defend, indemnify, and hold harmless Wavhaven and its affiliates, officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses, including reasonable attorney&apos;s fees, arising out of or in any way connected with (a) your access to or use of the Platform; (b) your violation of these Terms; (c) your Content; or (d) your violation of any third-party right, including any intellectual property right, publicity, confidentiality, property, or privacy right.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">10. Termination</h2>
       <ul className="list-disc list-inside mb-6 space-y-3">
        <li>
          <strong>By You:</strong> You may terminate your account at any time by contacting us or using account deletion features if available.
        </li>
        <li>
          <strong>By Wavhaven:</strong> We may suspend or terminate your account or access to the Platform at any time, with or without cause or notice, including for violation of these Terms.
        </li>
        <li>
          <strong>Effect:</strong> Upon termination, your right to use the Platform ceases. Provisions that by their nature should survive termination (e.g., ownership, disclaimers, liability limits, indemnification) shall survive.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4">11. Governing Law and Dispute Resolution</h2>
      <p className="mb-6">
        These Terms shall be governed by the laws of {/* [Your State/Country] */}, without regard to its conflict of law principles. Any dispute arising from these Terms or your use of the Platform shall be resolved exclusively in the state or federal courts located in {/* [Your City, State/Country] */}. {/* [Optional: Add an arbitration clause if desired, reviewed by lawyer] */}
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">12. Changes to Terms</h2>
      <p className="mb-6">
        We reserve the right to modify these Terms at any time. If we make material changes, we will notify you by email or by posting a notice on the Platform prior to the change becoming effective. Your continued use of the Platform after the effective date constitutes your acceptance of the revised Terms.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">13. Contact Us</h2>
      <p className="mb-6">
        If you have any questions about these Terms, please contact us at{' '}
        <Link href="/support" className="text-primary hover:underline">
          Support {/* [Link to /support] */}
        </Link>{' '}
        or {/* [Your Support Email Address] */}.
      </p>

      <p className="mt-12 text-sm text-muted-foreground italic">
        <strong>Legal Disclaimer:</strong> This document is provided for informational purposes. Consult with a legal professional to ensure it meets your specific needs and complies with applicable laws.
      </p>
    </div>
  );
} 