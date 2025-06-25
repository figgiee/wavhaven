'use client'; // May need client-side logic for form submission

import Link from 'next/link';
import { Twitter, Instagram, Facebook, Send } from 'lucide-react'; // Using Send for SoundCloud as placeholder
import { Logo } from '@/components/ui/Logo'; // Use the new Logo component

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// Define types for footer links if needed
interface FooterLink {
  href: string;
  label: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

// Updated data for footer links
const footerSectionsData: FooterSection[] = [
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About Wavhaven' },
      { href: '/blog', label: 'Blog' },
      { href: '/careers', label: 'Careers' }, // Placeholder
      { href: '/press', label: 'Press' }, // Placeholder
    ],
  },
  {
    title: 'For Producers',
    links: [
      { href: '/upload', label: 'Start Selling Beats' },
      { href: '/producer/dashboard', label: 'Producer Dashboard' },
      { href: '/guidelines', label: 'Submission Guidelines' },
      { href: '/faq/producer', label: 'Producer FAQ' },
    ],
  },
  {
    title: 'For Customers',
    links: [
      { href: '/explore?type=beat', label: 'Explore Beats' },
      { href: '/licensing', label: 'Licensing Info' },
      { href: '/faq/customer', label: 'Customer FAQ' },
      { href: '/support', label: 'Contact Support' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { href: '/terms', label: 'Terms of Service' },
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/cookies', label: 'Cookie Policy' },
      { href: '/sitemap', label: 'Sitemap' }, // Placeholder
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
        "relative border-t border-neutral-700/50 bg-abyss-blue pt-16 pb-12 sm:pt-20 sm:pb-16",
        className
    )}>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8"> {/* Outer grid for logo vs links area */}
          {/* Column 1: Logo & Copyright */}
          <div className="lg:col-span-1 space-y-4">
                            <Logo 
                    width={48} 
                    height={28} 
                    hoverEffect="brightness"
                />
            <p className="text-sm text-neutral-400">
              &copy; {currentYear} WAVHAVEN.
              <br />
              All rights reserved.
            </p>
          </div>

          {/* Column 2 (spanning 4 on lg): Link Sections Container */}
          <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {footerSectionsData.map((section) => (
              <div key={section.title}> {/* Each link section is a grid item here */}
                <h3 className="text-base font-semibold text-neutral-100 mb-4">{section.title}</h3>
                <ul className="space-y-2.5">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <Link 
                        href={link.href} 
                        className="text-sm text-neutral-400 hover:text-cyan-glow transition-colors duration-150"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Newsletter & Social Links - a new row below the columns */}
        <div className="mt-12 pt-8 border-t border-neutral-700/50 flex flex-col sm:flex-row justify-between items-center">
          <div className="mb-6 sm:mb-0">
            <h3 className="text-base font-semibold text-neutral-100 mb-2">Stay Updated</h3>
            <form onSubmit={handleSubscribe} className="flex items-center gap-2 max-w-sm">
              <Input 
                type="email" 
                name="email" 
                placeholder="Enter your email" 
                className="bg-neutral-800 border-neutral-700 placeholder-neutral-500 text-sm flex-grow" 
                required 
              />
              <Button type="submit" variant="luminous" size="sm" className="px-4">
                <Send size={16} className="mr-2" />
                Subscribe
              </Button>
            </form>
          </div>

          <div className="flex space-x-5">
            <Link href="#" aria-label="Facebook" className="text-neutral-400 hover:text-cyan-glow transition-colors">
              <Facebook size={20} />
            </Link>
            <Link href="#" aria-label="Twitter" className="text-neutral-400 hover:text-cyan-glow transition-colors">
              <Twitter size={20} />
            </Link>
            <Link href="#" aria-label="Instagram" className="text-neutral-400 hover:text-cyan-glow transition-colors">
              <Instagram size={20} />
            </Link>
            {/* Add other social icons like YouTube, Twitch if needed */}
          </div>
        </div>
      </div>
    </footer>
  );
} 