import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// TODO: Define actual license details/limits
const licenseTypes = [
  {
    name: "Basic Lease (MP3)",
    files: "MP3",
    streaming: "100,000", // Placeholder
    sales: "2,000", // Placeholder
    performances: "Limited",
    video: "1 Video (Limited Monet.)",
    exclusivity: "No",
    credit: "Yes",
    price: "$",
    description: [
      "Ideal for demos, smaller projects, and non-profit use.",
      "Grants limited rights for distribution and streaming."
    ]
  },
  {
    name: "Premium Lease (WAV)",
    files: "MP3, WAV",
    streaming: "500,000", // Placeholder
    sales: "10,000", // Placeholder
    performances: "Allowed",
    video: "1 Video (Monet. Allowed)",
    exclusivity: "No",
    credit: "Yes",
    price: "$$",
    description: [
      "Higher quality audio and increased usage limits.",
      "Suitable for independent releases and music videos."
    ]
  },
  {
    name: "Trackout Lease (Stems)",
    files: "MP3, WAV, Stems",
    streaming: "1,000,000", // Placeholder
    sales: "Unlimited", // Placeholder
    performances: "Allowed",
    video: "Unlimited Videos",
    exclusivity: "No",
    credit: "Yes",
    price: "$$$",
    description: [
      "Includes individual track files (stems) for full mixing control.",
      "Best for professional mixing/mastering and higher distribution needs."
    ]
  },
  {
    name: "Unlimited Lease",
    files: "MP3, WAV, [Stems?]", // Confirm if stems included
    streaming: "Unlimited",
    sales: "Unlimited",
    performances: "Allowed",
    video: "Unlimited Videos",
    exclusivity: "No",
    credit: "Yes",
    price: "$$$$",
    description: [
      "Maximum usage rights without exclusivity.",
      "Suitable for major releases and extensive commercial use."
    ]
  },
  {
    name: "Exclusive Rights",
    files: "MP3, WAV, Stems",
    streaming: "Unlimited",
    sales: "Unlimited",
    performances: "Allowed",
    video: "Unlimited Videos",
    exclusivity: "Yes",
    credit: "Yes (Negotiable)",
    price: "$$$$$",
    description: [
      "Grants sole ownership of usage rights; beat removed from sale.",
      "Requires direct negotiation/contract. For serious artists/labels."
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
                  {/* Price indication removed, focus on features */} 
                </ul>
                {license.name === "Exclusive Rights" && (
                  <p className="mt-2 text-xs italic">Note: Exclusive sales often require direct communication/contract between buyer and producer, potentially facilitated by Wavhaven. {/* TODO: Clarify platform role */}</p>
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
              {[ 'Files', 'Streaming Limit', 'Sales Limit', 'Performances', 'Video Rights', 'Exclusivity', 'Credit Required', 'Price (Approx)'].map((feature) => (
                <TableRow key={feature} className="hover:bg-gray-700/20">
                  <TableCell className="px-4 py-3 font-medium text-white whitespace-nowrap">{feature}</TableCell>
                  {licenseTypes.map(lt => (
                    <TableCell key={lt.name} className="px-4 py-3 text-gray-300 whitespace-nowrap">
                      {lt[feature.toLowerCase().replace(/ /g, '').replace('(approx)', '') as string] ?? '-'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
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