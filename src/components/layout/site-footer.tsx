'use client'; // May need client-side logic for form submission

import Link from 'next/link';
import { Twitter, Instagram, Facebook, Send } from 'lucide-react'; // Using Send for SoundCloud as placeholder

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
// import { AnimatedLogo } from '@/components/layout/site-header'; // Removing logo from footer

// Define types for footer links if needed
interface FooterLink {
  href: string;
  label: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

// Data for footer links - replace placeholders with actual URLs
const footerSections: FooterSection[] = [
  {
    title: 'WAVHaven',
    links: [
      { href: '/explore?type=beat', label: 'Explore' },
      { href: '/about', label: 'About Us' }, // TODO: Add about page URL
      { href: '/blog', label: 'Blog' }, // TODO: Add blog URL
    ],
  },
  {
    title: 'For Producers',
    links: [
      { href: '/upload', label: 'Start Selling' },
      { href: '/faq/producer', label: 'Producer FAQ' }, // TODO: Add producer FAQ URL
      { href: '/guidelines', label: 'Submission Guidelines' }, // TODO: Add guidelines URL
    ],
  },
  {
    title: 'For Customers',
    links: [
      { href: '/faq/customer', label: 'Customer FAQ' }, // TODO: Add customer FAQ URL
      { href: '/licensing', label: 'Licensing Info' }, // TODO: Add licensing URL
      { href: '/support', label: 'Contact Support' }, // TODO: Add support URL
      { href: '/returns', label: 'Returns & Refunds' }, // TODO: Add returns URL
    ],
  },
];

export function SiteFooter({ className }: { className?: string }) {
  const currentYear = new Date().getFullYear();

  const handleSubscribe = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email');
    console.log('Subscribing email:', email);
    // TODO: Implement actual API call to subscribe endpoint
    // TODO: Add loading state and success/error feedback
  };

  return (
    <footer className={cn(
        // --- Reduced top margin (mt-24) --- 
        "relative mt-24 border-t border-white/5", 
        "bg-background", // Simplified background for both modes, relies on layout bg
        className
    )}>
      {/* --- Reduced overall padding (py-8) --- */}
      <div className="relative z-10 max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* --- Reduced grid gap, use text-xs --- */} 
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-xs">
           {footerSections.map((section) => (
            <div key={section.title}>
              {/* --- Adjusted heading margin --- */} 
              <h4 className="font-semibold text-foreground mb-3">{section.title}</h4>
              {/* --- Reduced list spacing --- */} 
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    {/* --- Ensure text is gray and smaller --- */}
                    <Link href={link.href} className="text-gray-400 hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            {/* --- Adjusted heading margin --- */} 
            <h4 className="font-semibold text-foreground mb-3">Stay Connected</h4>
            {/* --- Reduced social icon margin --- */} 
            <ul className="flex space-x-4 mb-4">
              <li>
                <a href="#" aria-label="Twitter" className="text-gray-400 hover:text-white transition-colors">
                  <Twitter size={18} /> {/* Slightly smaller icons */}
                </a>
              </li>
              <li>
                <a href="#" aria-label="Instagram" className="text-gray-400 hover:text-white transition-colors">
                  <Instagram size={18} />
                </a>
              </li>
              <li>
                <a href="#" aria-label="Facebook" className="text-gray-400 hover:text-white transition-colors">
                  <Facebook size={18} />
                </a>
              </li>
               <li>
                 <a href="#" aria-label="SoundCloud" className="text-gray-400 hover:text-white transition-colors">
                   <Send size={18} />
                 </a>
               </li>
            </ul>

            <div>
              {/* --- Simplified subscribe text --- */} 
              <p className="text-gray-400 text-xs mb-2">Subscribe for updates.</p>
              <form className="flex" onSubmit={handleSubscribe}>
                <label htmlFor="newsletter-email" className="sr-only">Email address</label>
                <Input
                  type="email"
                  id="newsletter-email"
                  name="email"
                  placeholder="Enter your email"
                  required
                  // --- Adjusted input styling (smaller?) --- 
                  className="flex-1 px-2 py-1.5 text-xs rounded-r-none"
                  size="sm" // Use smaller size variant if available
                />
                <Button
                  type="submit"
                  // --- Adjusted button styling (smaller?) --- 
                  className="px-2.5 py-1.5 text-xs rounded-l-none transition-colors"
                  size="sm" // Use smaller size variant
                 >
                   Subscribe
                 </Button>
              </form>
            </div>
          </div>
        </div>

        {/* --- Reduced margin-top, adjusted border color --- */}
        <div className="mt-12 pt-6 border-t border-white/5">
          <div className="text-center">
            {/* --- Kept text small --- */}
            <p className="text-gray-500 text-xs mb-2">
              &copy; {currentYear} WavHaven. All rights reserved.
            </p>
            {/* --- Reduced gap for legal links --- */}
            <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
              <li>
                <Link href="/terms" className="text-gray-500 hover:text-gray-300 transition-colors">
                  Terms
                </Link> {/* Shortened text */}
              </li>
              <li>
                <Link href="/privacy" className="text-gray-500 hover:text-gray-300 transition-colors">
                  Privacy
                </Link> {/* Shortened text */}
              </li>
              <li>
                <Link href="/cookies" className="text-gray-500 hover:text-gray-300 transition-colors">
                  Cookies
                </Link> {/* Shortened text */}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
} 