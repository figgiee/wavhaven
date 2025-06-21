import Link from 'next/link';

// Reusable FAQ components from producer FAQ (Could be moved to a shared file)
const FAQSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <section>
    <h2 className="text-2xl font-semibold text-white mb-6 border-b border-white/10 pb-2">{title}</h2>
    <div className="space-y-6">
      {children}
    </div>
  </section>
);

const FAQItem = ({ question, children }: { question: string, children: React.ReactNode }) => (
  <div>
    <h3 className="text-lg font-medium text-white mb-2">Q: {question}</h3>
    <div className="text-gray-400 space-y-2 pl-6">{children}</div>
  </div>
);

export default function CustomerFAQPage() {
  return (
    <div className="max-w-screen-md mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12 text-gray-300">
      <h1 className="text-4xl font-bold text-white mb-8 text-center">Customer FAQ - Finding & Using Sounds on Wavhaven</h1>
      <p className="text-center text-lg text-gray-400 -mt-4 mb-12">Have questions about browsing, buying, or using sounds from Wavhaven? We've got you covered.</p>

      <FAQSection title="Finding Sounds">
        <FAQItem question="How do I search for sounds?">
          <p>Use the main search bar on the homepage or explore page. You can search by title, producer name, genre, mood, or keywords.</p>
        </FAQItem>
        <FAQItem question="How can I filter results?">
          <p>On the <Link href="/explore" className="text-indigo-400 hover:text-indigo-300 underline">Explore page</Link>, use the filter sidebar to narrow down results by Content Type (Beats, Loops, etc.), Genre, Mood, BPM range, and Key.</p>
        </FAQItem>
        <FAQItem question="How do previews work?">
          <p>Most tracks have an audio preview available directly on the track card or track page. These previews are typically lower quality (MP3) and may contain producer tags to prevent unauthorized use.</p>
        </FAQItem>
      </FAQSection>

      <FAQSection title="Licensing">
        <FAQItem question="What do the different licenses mean (Basic, Premium, Exclusive, etc.)?">
          <p>Each license grants different usage rights (e.g., streaming limits, commercial use, file formats included). It's crucial to choose the license that fits your project needs. Please see our detailed <Link href="/licensing" className="text-indigo-400 hover:text-indigo-300 underline">Licensing Info</Link> page for a full breakdown of each license type.</p>
        </FAQItem>
        <FAQItem question="What can I use the purchased sounds for?">
          <p>Your usage rights depend entirely on the specific license you purchase. Refer to the license description and our <Link href="/licensing" className="text-indigo-400 hover:text-indigo-300 underline">Licensing Info</Link> page. General restrictions often apply, like not reselling the sound as-is.</p>
        </FAQItem>
        <FAQItem question="Do I need to credit the producer?">
          <p>Credit requirements vary by license type. Check the details for the specific license you are purchasing on the track page and our <Link href="/licensing" className="text-indigo-400 hover:text-indigo-300 underline">Licensing Info</Link> page. Proper credit is often required (e.g., "Prod. by [Producer Name]").</p>
        </FAQItem>
      </FAQSection>

      <FAQSection title="Purchasing & Payment">
        <FAQItem question="What payment methods are accepted?">
          {/* TODO: Confirm payment methods */} 
          <p>We accept major credit cards (Visa, Mastercard, American Express) and PayPal [Confirm payment methods] processed securely via Stripe.</p>
        </FAQItem>
        <FAQItem question="Is my payment information secure?">
          <p>Yes. All payments are processed through Stripe, a certified PCI Service Provider Level 1. Wavhaven does not store your full credit card details.</p>
        </FAQItem>
        <FAQItem question="How do I apply discount codes?">
          <p>If you have a valid discount code, you can enter it during the checkout process before completing your payment.</p>
        </FAQItem>
      </FAQSection>

      <FAQSection title="Downloads">
        <FAQItem question="How do I access my purchased files?">
          {/* TODO: Confirm exact dashboard links */} 
          <p>After a successful purchase, your downloadable files will be available in your Account Dashboard under the 'My Downloads' or 'Order History' section {/* <Link href="/downloads">/Downloads Link</Link> */}. You will also receive an email confirmation (for guest checkouts, this email contains your download links).</p>
        </FAQItem>
        <FAQItem question="What format will the downloaded files be in?">
          <p>The file format(s) depend on the license you purchased (e.g., MP3, WAV, Stems ZIP). This is specified in the license details.</p>
        </FAQItem>
        <FAQItem question="What if I have trouble downloading?">
          <p>Ensure you have a stable internet connection. If links expire or you encounter technical issues, please contact our support team via the <Link href="/support" className="text-indigo-400 hover:text-indigo-300 underline">Support page</Link> with your order details.</p>
        </FAQItem>
      </FAQSection>

      <FAQSection title="Account Management">
        <FAQItem question="How do I create an account?">
          <p>Click the 'Sign Up' or 'Register' button {/* <Link href="/sign-up">/Sign Up Link</Link> */} and follow the instructions.</p>
        </FAQItem>
        <FAQItem question="How do I manage my orders/downloads?">
          {/* TODO: Confirm exact dashboard links */} 
          <p>Log in to your account and visit your Dashboard {/* <Link href="/dashboard">/Dashboard Link</Link> */} or Downloads {/* <Link href="/downloads">/Downloads Link</Link> */} section.</p>
        </FAQItem>
        <FAQItem question="How do I update my information?">
          {/* TODO: Confirm account settings link */} 
          <p>You can update your email, password, and other profile details in your <Link href="/settings/account" className="text-indigo-400 hover:text-indigo-300 underline">Account Settings</Link>.</p>
        </FAQItem>
      </FAQSection>

      <FAQSection title="Troubleshooting">
        <FAQItem question="What if a downloaded file seems corrupted or has issues?">
          <p>Please contact support <Link href="/support" className="text-indigo-400 hover:text-indigo-300 underline">here</Link> immediately with your Order ID and details about the issue. We will investigate and work with the producer to resolve it.</p>
        </FAQItem>
        <FAQItem question="What if the sound isn't what I expected based on the preview or description?">
          <p>We encourage you to listen carefully to previews before purchasing. Due to the digital nature of our products, refunds are limited. However, if you believe the product was grossly misrepresented, please contact support to discuss the situation. See our <Link href="/returns" className="text-indigo-400 hover:text-indigo-300 underline">Returns & Refunds</Link> policy for details.</p>
        </FAQItem>
      </FAQSection>

    </div>
  );
} 