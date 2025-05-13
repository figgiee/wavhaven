'use client'; // Needed for form handling state (even if basic)

import Link from 'next/link';
// import { useState } from 'react'; // No longer needed
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Mail, HelpCircle } from 'lucide-react';

export default function SupportPage() {
  // Basic state for feedback, replace with actual form handling (e.g., react-hook-form)
  // const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle'); // Remove
  // const [message, setMessage] = useState(''); // Remove

  // const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => { // Remove entire function
  //   event.preventDefault();
  //   setStatus('submitting');
  //   setMessage('');
  //
  //   // --- TODO: Implement actual form submission logic --- 
  //   // Example: Send data to an API endpoint
  //   // const formData = new FormData(event.currentTarget);
  //   // const response = await fetch('/api/support', { method: 'POST', body: formData });
  //   // if (response.ok) {
  //   //   setStatus('success');
  //   //   setMessage('Your message has been sent successfully!');
  //   //   event.currentTarget.reset();
  //   // } else {
  //   //   setStatus('error');
  //   //   setMessage('Failed to send message. Please try again or email us directly.');
  //   // }
  //   
  //   // --- Placeholder for demo --- 
  //   await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
  //   // Simulate success for now
  //   setStatus('success');
  //   setMessage('Placeholder: Your message would have been sent!');
  //    // event.currentTarget.reset(); // Uncomment when logic is implemented
  //   // ------------------------ 
  // };

  return (
    <div className="max-w-screen-md mx-auto px-4 sm:px-6 lg:px-8 py-16 text-gray-300">
      <div className="text-center mb-12">
        <HelpCircle className="mx-auto h-16 w-16 text-indigo-400 mb-4" />
        <h1 className="text-4xl font-bold text-white mb-3">Wavhaven Support</h1>
        <p className="text-lg text-gray-400">
          We're here to help!
        </p>
      </div>

      <section className="mb-10 bg-gray-800/30 p-6 rounded-lg border border-white/10">
        <h2 className="text-xl font-semibold text-white mb-4">Check our FAQs First</h2>
        <p className="text-gray-400 mb-4">
          Many common questions are answered in our FAQ pages. Please check if your question is covered there:
        </p>
        <ul className="list-disc list-outside pl-5 space-y-2 text-indigo-400">
          <li><Link href="/faq/customer" className="hover:underline">Customer FAQ</Link></li>
          <li><Link href="/faq/producer" className="hover:underline">Producer FAQ</Link></li>
          <li><Link href="/licensing" className="hover:underline">Licensing Information</Link></li>
        </ul>
      </section>

      <section className="text-center">
        <h2 className="text-2xl font-semibold text-white mb-4">Contact Us</h2>
        <p className="text-gray-400 mb-6">
          If you can't find an answer in our FAQs, please reach out to our support team. We'll be using a ticketing system soon for more efficient support.
        </p>
        <p className="text-gray-400 mb-4">
          For now, you can email us at:
        </p>
        <a
          href="mailto:support@wavhaven.com" // Replace with your actual support email
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Mail className="mr-2 h-5 w-5" />
          support@wavhaven.com {/* Replace with your actual support email */}
        </a>
        <p className="text-xs text-gray-500 mt-8">
          Our support team aims to respond within 24-48 business hours (Mon-Fri).
        </p>
      </section>
    </div>
  );
} 