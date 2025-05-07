import Link from 'next/link';

export default function GuidelinesPage() {
  return (
    <div className="max-w-screen-md mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12 text-gray-300">
      <h1 className="text-4xl font-bold text-white mb-8 text-center">Wavhaven Submission Guidelines</h1>
      <p className="text-center text-lg text-gray-400 -mt-4 mb-12">
        To maintain a high standard of quality and provide the best experience for creators, please adhere to the following guidelines when submitting your sounds. Submissions that do not meet these standards may be rejected.
      </p>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">1. Audio Quality Standards</h2>
        <ul className="list-disc list-outside space-y-3 pl-5 text-gray-400">
          <li>
            <strong>Mastering:</strong> All tracks (beats, loops) must be properly mixed and mastered. Aim for a professional, balanced sound with adequate headroom (typically -3dB to -6dB peak). Avoid clipping and excessive distortion unless it's a clear creative choice appropriate for the genre.
          </li>
          <li>
            <strong>Bitrate/Sample Rate:</strong>
            <ul className="list-circle list-outside space-y-1 pl-5 mt-2">
              <li><strong>Previews:</strong> MP3 format, 320kbps recommended (minimum 192kbps). Must include your producer tag.</li>
              <li><strong>Main Files (WAV):</strong> Minimum 16-bit/44.1kHz WAV. 24-bit/44.1kHz or 48kHz WAV is preferred. Must be untagged.</li>
              <li><strong>Main Files (MP3 - Basic License):</strong> 320kbps MP3. Must be untagged.</li>
              <li><strong>Stems:</strong> Clearly labeled WAV files, consolidated (start at the same point), minimum 16-bit/44.1kHz. Must be untagged.</li>
            </ul>
          </li>
          <li>
            <strong>Silence & Fades:</strong> Ensure tracks do not have excessive silence at the beginning or end. Apply appropriate fade-outs if needed.
          </li>
          <li>
            <strong>No Abrupt Cuts:</strong> Loops should be seamless unless designed otherwise.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">2. Originality & Samples</h2>
        <ul className="list-disc list-outside space-y-3 pl-5 text-gray-400">
          <li>
            <strong>Originality:</strong> All submitted content must be your original work.
          </li>
          <li>
            <strong>Sample Clearance:</strong> You <strong>must</strong> have the legal right to use any third-party samples included in your submissions.
            <ul className="list-circle list-outside space-y-1 pl-5 mt-2">
              <li>Use only royalty-free samples or loops explicitly cleared for commercial resale/distribution within derivative works.</li>
              <li><strong>Uncleared copyrighted samples are strictly prohibited.</strong> Discovery of uncleared samples will result in track removal and may lead to account suspension. You are solely responsible for sample clearance.</li>
              <li>Be prepared to provide proof of license for samples if requested.</li>
            </ul>
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">3. File Formatting & Naming</h2>
        <ul className="list-disc list-outside space-y-3 pl-5 text-gray-400">
          <li>
            <strong>General Naming:</strong> Use clear and descriptive filenames. A good format is: <code>TrackTitle - [BPM] - [Key] - [ProducerName].extension</code> (e.g., <code>Sunset Drive - 140 - Cmin - SynthKing.wav</code>).
          </li>
          <li>
            <strong>Previews:</strong> Must contain an audible producer tag throughout the file (not just at the beginning/end). Filename should indicate it's a preview (e.g., <code>TrackTitle_TaggedPreview.mp3</code>).
          </li>
          <li>
            <strong>Stems:</strong> Package stems in a single ZIP file. Each stem file within the ZIP should be clearly labeled (e.g., <code>Drums.wav</code>, <code>Bass.wav</code>, <code>Melody_1.wav</code>).
          </li>
          <li>
            <strong>Soundkits/Preset Packs:</strong> Must be well-organized in a ZIP file. Include clear folder structures and a README file if necessary (listing contents, installation instructions for presets).
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">4. Metadata Requirements</h2>
        <p className="text-gray-400 mb-3">Accurate metadata is crucial for discoverability. Provide the following for each submission:</p>
        <ul className="list-disc list-outside space-y-2 pl-5 text-gray-400">
          <li><strong>Title:</strong> Clear and concise title.</li>
          <li><strong>Description:</strong> Engaging description of the sound's vibe, instrumentation, or potential use.</li>
          <li><strong>BPM:</strong> Accurate Beats Per Minute.</li>
          <li><strong>Key:</strong> Musical key (e.g., Cmin, F#maj).</li>
          <li><strong>Genre(s):</strong> Select relevant genres (e.g., Trap, Lo-Fi, Synthwave).</li>
          <li><strong>Mood(s)/Tags:</strong> Select relevant tags describing the feel (e.g., Dark, Energetic, Chill, Smooth).</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">5. Artwork Requirements</h2>
        <ul className="list-disc list-outside space-y-2 pl-5 text-gray-400">
          <li><strong>Format:</strong> JPG, PNG, or WEBP.</li>
          <li><strong>Dimensions:</strong> Minimum 1000x1000 pixels (square aspect ratio recommended).</li>
          <li><strong>Content:</strong> Must be professional, relevant to the music, and free of infringing material, explicit content, or excessive text/logos. Your artwork represents your brand.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">6. Review Process</h2>
        <ul className="list-disc list-outside space-y-3 pl-5 text-gray-400">
          <li>All submissions are reviewed by the Wavhaven curation team.</li>
          {/* TODO: Confirm Review Timeframe */} 
          <li>We aim to review submissions within [Review Timeframe, e.g., 3-5 business days], but this may vary based on volume.</li>
          <li>You will be notified via email about the status of your submission (Approved or Rejected).</li>
          <li>Common reasons for rejection include poor audio quality, uncleared samples, inaccurate metadata, or unprofessional artwork. Feedback may be provided for rejected submissions.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">7. Content Policy</h2>
        <ul className="list-disc list-outside space-y-3 pl-5 text-gray-400">
          <li>Do not submit content that infringes on copyright or trademarks.</li>
          <li>Do not submit hateful, discriminatory, or illegal content.</li>
          <li>Violations of our content policy may result in immediate content removal and account suspension.</li>
        </ul>
      </section>

      <section className="mt-12 border-t border-white/10 pt-8 text-center">
        <p className="text-gray-400">
          By submitting content to Wavhaven, you confirm that you have read, understood, and agree to these guidelines and our {/* TODO: Link to Terms */} <Link href="/terms" className="text-indigo-400 hover:text-indigo-300 underline">Terms of Service</Link>.
        </p>
      </section>
    </div>
  );
} 