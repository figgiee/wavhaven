import Link from 'next/link';

export default function ReturnsPage() {
  return (
    <div className="max-w-screen-md mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10 text-gray-300">
      <h1 className="text-4xl font-bold text-white mb-8 text-center">Wavhaven Returns & Refund Policy</h1>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">Our Policy</h2>
        <p className="text-gray-400 mb-4">
          At Wavhaven, we strive to provide high-quality digital sounds and a seamless purchasing experience. Due to the <strong>digital nature of our products</strong> (beats, loops, soundkits, presets), which are instantly downloadable upon purchase, <strong>all sales are generally considered final.</strong>
        </p>
        <p className="text-gray-400">
          We typically <strong>do not offer refunds or exchanges</strong> once a product license has been purchased and the associated file(s) have been made available for download. Please listen to previews carefully and ensure you select the correct license type for your needs before completing your purchase.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">Exceptions for Review</h2>
        <p className="text-gray-400 mb-4">
          While refunds are rare, we may review requests under the following specific circumstances:
        </p>
        <ol className="list-decimal list-outside space-y-3 pl-5 text-gray-400">
          <li>
            <strong>Accidental Duplicate Purchase:</strong> If you unintentionally purchased the exact same license for the exact same track multiple times due to a system error or clear mistake during checkout.
          </li>
          <li>
            <strong>Technical Issues:</strong> If a downloaded file is corrupted, incomplete, or technically unusable, and we (or the producer) are unable to provide a working replacement file within a reasonable timeframe after you report the issue. We reserve the right to verify the technical issue.
          </li>
          <li>
            <strong>Gross Misrepresentation:</strong> If the purchased product is fundamentally different from its description or preview in a way that constitutes gross misrepresentation (e.g., wrong BPM/key advertised, completely different sound than previewed). This requires clear evidence and is subject to review by our team.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">How to Request a Review</h2>
        <p className="text-gray-400 mb-4">
          If you believe your situation falls under one of the exceptions above, please contact our support team within <strong>7 days</strong> of your purchase via our <Link href="/support" className="text-indigo-400 hover:text-indigo-300 underline">Support page</Link>.
        </p>
        <p className="text-gray-400 mb-3">Please include:</p>
        <ul className="list-disc list-outside space-y-1 pl-5 text-gray-400">
          <li>Your Order ID.</li>
          <li>The email address used for the purchase.</li>
          <li>The specific track(s) and license(s) involved.</li>
          <li>A detailed explanation of the issue.</li>
          <li>Any relevant proof (e.g., screenshots of errors, description of the misrepresentation).</li>
        </ul>
        <p className="text-gray-400 mt-4">
          Our support team will review your request and respond accordingly. Please note that submitting a request does not guarantee a refund.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">Non-Refundable Scenarios</h2>
        <p className="text-gray-400 mb-4">
          Refunds will <strong>not</strong> be issued for reasons including (but not limited to):
        </p>
        <ul className="list-disc list-outside space-y-2 pl-5 text-gray-400">
          <li>You changed your mind after purchase.</li>
          <li>You decided you don't like the sound after listening to the full version.</li>
          <li>You purchased the wrong license type for your needs (please review <Link href="/licensing" className="text-indigo-400 hover:text-indigo-300 underline">Licensing Info</Link> before buying).</li>
          <li>You lack the necessary software or knowledge to use the purchased product (e.g., specific DAW requirements for presets, understanding stems).</li>
          <li>You found the sound cheaper elsewhere after purchase.</li>
          <li>You did not listen to the available preview before purchasing.</li>
        </ul>
      </section>

      <section className="mt-12 border-t border-white/10 pt-8 text-center">
        <p className="text-gray-400">
          We appreciate your understanding of our policy regarding digital goods. If you have any questions before purchasing, please don't hesitate to <Link href="/support" className="text-indigo-400 hover:text-indigo-300 underline">Contact Support</Link>.
        </p>
      </section>
    </div>
  );
} 