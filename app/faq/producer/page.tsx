import Link from 'next/link';

export default function ProducerFAQPage() {
  // Define local components *before* the return statement
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

  // Main return statement for the ProducerFAQPage component
  return (
    <div className="max-w-screen-md mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12 text-gray-300">
      <h1 className="text-4xl font-bold text-white mb-8 text-center">Producer FAQ - Selling Your Sounds on Wavhaven</h1>
      <p className="text-center text-lg text-gray-400 -mt-4 mb-12">Got questions about selling your beats, loops, soundkits, or presets on Wavhaven? Find answers here.</p>

      <FAQSection title="Getting Started">
        <FAQItem question="How do I sign up as a producer?">
          <p>Simply register for a standard Wavhaven account first. Once logged in, you can complete your producer profile and manage settings related to selling your sounds via your <Link href="/settings/profile" className="text-indigo-400 hover:text-indigo-300 underline">Account Settings</Link>.</p>
        </FAQItem>
        <FAQItem question="What are the requirements to sell on Wavhaven?">
          <p>We require producers to submit high-quality, original sounds that meet our technical and creative standards. You must own all necessary rights to the content you upload. Please review our full <Link href="/guidelines" className="text-indigo-400 hover:text-indigo-300 underline">Submission Guidelines</Link> for details.</p>
        </FAQItem>
        <FAQItem question="Is there an approval process for producers or sounds?">
          <p>Yes, there is an initial review process for new producers to ensure profile completeness and understanding of our guidelines. Additionally, every sound submitted goes through a review process to maintain platform quality.</p>
        </FAQItem>
      </FAQSection>

      <FAQSection title="Uploading & Managing Sounds">
        <FAQItem question="How do I upload my sounds?">
          <p>Once your producer profile is approved, you can access the <Link href="/upload" className="text-indigo-400 hover:text-indigo-300 underline">upload dashboard</Link>. Follow the steps to upload your files and provide all required metadata (title, BPM, key, genre, tags, description).</p>
        </FAQItem>
        <FAQItem question="What file formats are accepted?">
          <p>This depends on the content type. Generally, we require high-quality WAV files for main purchases and tagged MP3s for previews. Specific requirements for loops, kits, and presets are detailed in our <Link href="/guidelines" className="text-indigo-400 hover:text-indigo-300 underline">Submission Guidelines</Link>.</p>
        </FAQItem>
        <FAQItem question="How do I set prices?">
          <p>You set the price for each license type you offer for your tracks during the upload or editing process. Consider the value, usage rights, and market standards.</p>
        </FAQItem>
        <FAQItem question="How do I edit or remove my listings?">
          <p>You can manage your uploaded sounds, including editing metadata, prices, and removing listings, from your <Link href="/dashboard" className="text-indigo-400 hover:text-indigo-300 underline">Producer Dashboard</Link>.</p>
        </FAQItem>
      </FAQSection>

      <FAQSection title="Licensing & Rights">
        <FAQItem question="What license types can I offer?">
          <p>Wavhaven supports various license types (e.g., Basic, Premium, Stems, Unlimited, Exclusive). You choose which licenses to offer for each track. See our detailed <Link href="/licensing" className="text-indigo-400 hover:text-indigo-300 underline">Licensing Info</Link> page for explanations of each type.</p>
        </FAQItem>
        <FAQItem question="Who owns the copyright to the sounds I upload?">
          <p>As the producer, you retain 100% ownership of your copyright. You are granting licenses to customers for specific uses based on the license type they purchase.</p>
        </FAQItem>
        <FAQItem question="What about samples used in my beats?">
          <p>You MUST have the legal right to use any samples included in your sounds. This means using royalty-free samples or obtaining proper clearance for any copyrighted material. Uploading beats with uncleared samples is strictly prohibited and can lead to account suspension. Please review our policy in the <Link href="/guidelines" className="text-indigo-400 hover:text-indigo-300 underline">Submission Guidelines</Link>.</p>
        </FAQItem>
      </FAQSection>

      <FAQSection title="Payments & Payouts">
        <FAQItem question="How much commission does Wavhaven take?">
          <p>Wavhaven currently takes 0% commission on sales. This means you keep all your earnings from sales on the platform, helping you maximize your income.</p>
        </FAQItem>
        <FAQItem question="How and when do I get paid?">
          <p>Payouts are processed via Stripe Connect. Payouts are made on a monthly basis, provided you meet the minimum payout threshold of $25. You can set up and manage your payout details in your <Link href="/settings/account" className="text-indigo-400 hover:text-indigo-300 underline">Account Settings</Link>.</p>
        </FAQItem>
        <FAQItem question="How do I track my sales and earnings?">
          <p>Your Producer Dashboard provides detailed analytics on your sales, earnings, track performance, and payout history.</p>
        </FAQItem>
      </FAQSection>

      <FAQSection title="Promotion & Visibility">
        <FAQItem question="How can I get my sounds featured?">
          <p>Our curation team regularly selects high-quality, popular, and unique sounds for featuring on the homepage, playlists, and promotional campaigns. Focus on excellent quality, accurate metadata, and professional presentation.</p>
        </FAQItem>
        <FAQItem question="Does Wavhaven help promote producer content?">
          <p>Yes, we actively promote the platform and featured content through various channels, including social media, email marketing, and potential partnerships.</p>
        </FAQItem>
      </FAQSection>

      <FAQSection title="Account Management">
        <FAQItem question="How do I update my profile/payment info?">
          <p>You can update your public producer profile, display name, bio, social links, and payout information within your <Link href="/settings/account" className="text-indigo-400 hover:text-indigo-300 underline">Account Settings</Link>.</p>
        </FAQItem>
      </FAQSection>

    </div>
  );
}