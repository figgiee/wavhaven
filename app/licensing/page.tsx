import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// TODO: Define actual license details/limits
const licenseTypes = [
  {
    name: "Basic Lease (MP3)",
    files: "Tagged MP3",
    streaming: "100,000 Streams (Audio & Video)",
    sales: "2,000 Units (Downloads/Physical)",
    performances: "Non-Profit Live Performances",
    video: "1 Music Video (Non-Monetized Online)",
    exclusivity: "No",
    credit: "Producer Must Be Credited",
    price: "$ (Typical: $19 - $30)", // Price indication
    description: [
      "Ideal for demos, mixtapes, and non-commercial projects.",
      "Grants limited usage rights for online streaming and small-scale distribution.",
      "Beat remains available for others to license."
    ]
  },
  {
    name: "Standard Lease (WAV)",
    files: "MP3, WAV",
    streaming: "500,000 Streams (Audio & Video)",
    sales: "5,000 Units (Downloads/Physical)",
    performances: "Paid Live Performances Allowed",
    video: "1 Music Video (Monetization Allowed Online)",
    exclusivity: "No",
    credit: "Producer Must Be Credited",
    price: "$$ (Typical: $40 - $70)", // Price indication
    description: [
      "High-quality WAV file included for better audio fidelity.",
      "Increased usage limits suitable for independent releases and monetized online videos.",
      "Beat remains available for others to license."
    ]
  },
  {
    name: "Premium Lease (Trackouts)",
    files: "MP3, WAV, Trackout Stems",
    streaming: "1,000,000 Streams (Audio & Video)",
    sales: "10,000 Units (Downloads/Physical)",
    performances: "Paid Live Performances Allowed",
    video: "Unlimited Music Videos (Monetization Allowed Online)",
    exclusivity: "No",
    credit: "Producer Must Be Credited",
    price: "$$$ (Typical: $70 - $150)", // Price indication
    description: [
      "Includes individual track files (stems) for professional mixing and mastering.",
      "Higher usage limits for serious artists planning wider distribution.",
      "Beat remains available for others to license."
    ]
  },
  {
    name: "Unlimited Lease",
    files: "MP3, WAV, Trackout Stems",
    streaming: "Unlimited Streams (Audio & Video)",
    sales: "Unlimited Units (Downloads/Physical)",
    performances: "Paid Live Performances Allowed",
    video: "Unlimited Music Videos (Monetization Allowed Online)",
    exclusivity: "No",
    credit: "Producer Must Be Credited",
    price: "$$$$ (Typical: $150 - $300+)", // Price indication
    description: [
      "Maximum usage rights without exclusivity.",
      "Best for artists expecting significant reach and commercial use, without needing the beat taken off the market.",
      "Beat remains available for others to license."
    ]
  },
  {
    name: "Exclusive Rights",
    files: "MP3, WAV, Trackout Stems",
    streaming: "Unlimited Streams",
    sales: "Unlimited Units",
    performances: "Paid Live Performances Allowed",
    video: "Unlimited Music Videos (Monetization Allowed Online)",
    exclusivity: "Yes",
    credit: "Producer Must Be Credited (Often negotiable)",
    price: "$$$$$ (Contact Producer)", // Price indication
    description: [
      "Grants you exclusive rights to use the beat. The beat will be removed from sale on Wavhaven.",
      "Ideal for artists or labels requiring sole usage for major releases.",
      "Ownership of the original composition typically remains with the producer, but you gain exclusive usage rights."
    ]
  },
];

export default function LicensingPage() {
  return (
    <div className="max-w-screen-lg mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12 text-gray-300">
      <h1 className="text-4xl font-bold text-white mb-8 text-center">Understanding Wavhaven Sound Licenses</h1>
      <p className="text-center text-lg text-gray-400 -mt-4 mb-12 max-w-3xl mx-auto">
        Choosing the right license is essential for using sounds legally and effectively in your projects. This page explains the different license types offered by producers on Wavhaven. Always refer to the specific license details on the track page before purchasing.
      </p>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">Why Licensing Matters</h2>
        <p className="text-gray-400">
          When you purchase a sound on Wavhaven, you are not buying the copyright (ownership) of the sound itself; you are buying a <strong>license</strong>, which grants you specific permissions to use that sound under certain conditions. Producers retain the ownership of their work. Understanding these conditions protects both you (the buyer) and the producer.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-6">Wavhaven License Types</h2>
        <div className="space-y-8">
          {licenseTypes.map((license) => (
            <div key={license.name} className="bg-gray-800/30 p-6 rounded-lg border border-white/10">
              <h3 className="text-xl font-semibold text-indigo-400 mb-3">{license.name}</h3>
              <div className="text-sm text-gray-400 space-y-2">
                {license.description.map((desc, i) => <p key={i}>{desc}</p>)}
                <ul className="list-disc list-outside pl-5 pt-2 space-y-1">
                  <li><strong>Files Included:</strong> {license.files}</li>
                  <li><strong>Streaming Limit:</strong> {license.streaming}</li>
                  <li><strong>Sales Limit:</strong> {license.sales}</li>
                  <li><strong>Performances:</strong> {license.performances}</li>
                  <li><strong>Video Rights:</strong> {license.video}</li>
                  <li><strong>Exclusivity:</strong> {license.exclusivity}</li>
                  <li><strong>Credit Required:</strong> {license.credit}</li>
                  {/* Price indication can be shown here if desired, e.g., <p><strong>Typical Price:</strong> {license.price}</p> */}
                </ul>
                {license.name === "Exclusive Rights" && (
                  <p className="mt-2 text-xs italic">Note: For Exclusive Rights, Wavhaven helps connect the buyer and producer. The final agreement and transaction are typically handled externally between the parties.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-6">License Comparison Table</h2>
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <Table className="min-w-full divide-y divide-gray-700 bg-gray-800/30">
            <TableHeader>
              <TableRow className="hover:bg-gray-700/30">
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Feature</TableHead>
                {licenseTypes.map(lt => <TableHead key={lt.name} className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{lt.name.replace(/ \(.*\)/, '')}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-700/50 text-sm">
              {/* Define the features in the order they appear in the licenseTypes objects for consistent mapping */}
              {['files', 'streaming', 'sales', 'performances', 'video', 'exclusivity', 'credit', 'price'].map((featureKey) => {
                // Create a display-friendly feature name
                const featureName = featureKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace('price', 'Price (Approx)').replace('streaming', 'Streaming Limit').replace('sales', 'Sales Limit');
                return (
                  <TableRow key={featureKey} className="hover:bg-gray-700/20">
                    <TableCell className="px-4 py-3 font-medium text-white whitespace-nowrap">{featureName}</TableCell>
                    {licenseTypes.map(lt => (
                      <TableCell key={lt.name} className="px-4 py-3 text-gray-300 whitespace-nowrap">
                        {(lt as any)[featureKey] ?? '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-gray-500 mt-3 italic">
          *Note: This table is illustrative. Limits and terms are set by individual producers and may vary. Always check the specific license terms on the track page before purchasing.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">General Terms Applicable to All Licenses</h2>
        <ul className="list-disc list-outside space-y-2 pl-5 text-gray-400">
          <li><strong>Non-Transferable:</strong> Licenses are typically non-transferable and cannot be sold or given to a third party.</li>
          <li><strong>No Resale:</strong> You cannot resell the purchased sound/beat itself, only your derivative work (e.g., your song using the beat).</li>
          <li><strong>Copyright Ownership:</strong> The original producer always retains the underlying copyright ownership of the musical composition/sound recording. You are purchasing usage rights only (unless full rights transfer is explicitly stated in an Exclusive agreement).</li>
        </ul>
      </section>

      <section className="mt-12 border-t border-white/10 pt-8 text-center">
        <p className="text-gray-400">
          If you have any questions about licensing, please check our <Link href="/faq/customer" className="text-indigo-400 hover:text-indigo-300 underline">Customer FAQ</Link> or <Link href="/support" className="text-indigo-400 hover:text-indigo-300 underline">Contact Support</Link>.
        </p>
      </section>
    </div>
  );
} 