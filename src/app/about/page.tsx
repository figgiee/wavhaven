import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AboutPage() {
  return (
    <div className="max-w-screen-md mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8 text-gray-300">
      <h1 className="text-4xl font-bold text-white mb-6">Empowering Music Creators, One Sound at a Time.</h1>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-3">Mission</h2>
        <p>
          Our mission is to empower music creators worldwide by providing a meticulously curated marketplace for high-quality, unique sounds. We connect talented producers with artists, filmmakers, and content creators seeking the perfect audio elements to bring their visions to life.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-3">Vision</h2>
        <p>
          To be the leading global platform for discovering unique sonic textures and fostering a vibrant, collaborative community where producers thrive and creators find inspiration.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-3">The Wavhaven Story</h2>
        <p>
          Wavhaven was born from a simple idea: finding truly exceptional beats, loops, and sound packs shouldn't be like searching for a needle in a haystack. Frustrated by oversaturated markets and inconsistent quality, we set out to build a platform focused on <strong>curation and quality</strong>. We believe that both producers and creators deserve a better experience – a place where producers are recognized for their talent and creators can easily find sounds that elevate their projects. Wavhaven is that place.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-3">What Makes Wavhaven Different?</h2>
        <ul className="list-disc list-outside space-y-2 pl-5">
          <li><strong>Rigorous Curation:</strong> Every sound on Wavhaven is reviewed by our team to meet high standards of production quality, creativity, and usability.</li>
          <li><strong>Quality Over Quantity:</strong> We focus on building a catalogue of exceptional sounds rather than an overwhelming sea of options.</li>
          <li><strong>Exclusive Content:</strong> Discover unique beats, loops, soundkits, and presets you won't find anywhere else.</li>
          <li><strong>Producer Focused:</strong> We offer fair commission structures {/* [Optional: mention rate if decided] */} and tools to help our producers succeed.</li>
          <li><strong>Community Driven:</strong> We aim to build a space for collaboration, feedback, and growth within the music creation community.</li>
          <li><strong>Genre Expertise:</strong> While diverse, we have a deep focus on {/* [Mention core genres like Hip-Hop, Trap, R&B, Electronic, etc.] */}</li>
        </ul>
      </section>

      {/* Optional Section: Our Values - Uncomment if needed
      <section>
        <h2 className="text-2xl font-semibold text-white mb-3">Our Values</h2>
        <ul className="list-disc list-outside space-y-2 pl-5">
          <li><strong>Quality:</strong> We are committed to offering only professionally crafted, high-fidelity sounds.</li>
          <li><strong>Community:</strong> We foster a supportive and collaborative environment for creators and producers.</li>
          <li><strong>Fairness:</strong> We believe in transparent and equitable practices for everyone on our platform.</li>
          <li><strong>Innovation:</strong> We constantly seek ways to improve the discovery and creation process.</li>
        </ul>
      </section>
      */}

      {/* Optional Section: Meet the Team - Uncomment and add content if needed
      <section>
        <h2 className="text-2xl font-semibold text-white mb-3">Meet the Team</h2>
        <p>[Placeholder for brief team introductions and photos, if desired.]</p>
      </section>
      */}

      <section className="text-center pt-8">
        <h2 className="text-2xl font-semibold text-white mb-4">Ready to Find Your Sound?</h2>
        <p className="mb-6">Dive into our curated library and discover the perfect audio elements for your next project.</p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button asChild size="lg" className="bg-indigo-500 hover:bg-indigo-600">
            <Link href="/explore">Explore Sounds</Link>
          </Button>
          {/* TODO: Update href to actual producer onboarding/sign-up page if different */}
          <Button asChild variant="outline" size="lg" className="border-indigo-500 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300">
            <Link href="/sign-up">Join as Producer</Link>
          </Button>
        </div>
      </section>
    </div>
  );
} 