'use client'; // Needed for form handling state (even if basic)

import Link from 'next/link';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export default function SupportPage() {
  // Basic state for feedback, replace with actual form handling (e.g., react-hook-form)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('submitting');
    setMessage('');

    // --- TODO: Implement actual form submission logic --- 
    // Example: Send data to an API endpoint
    // const formData = new FormData(event.currentTarget);
    // const response = await fetch('/api/support', { method: 'POST', body: formData });
    // if (response.ok) {
    //   setStatus('success');
    //   setMessage('Your message has been sent successfully!');
    //   event.currentTarget.reset();
    // } else {
    //   setStatus('error');
    //   setMessage('Failed to send message. Please try again or email us directly.');
    // }
    
    // --- Placeholder for demo --- 
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
    // Simulate success for now
    setStatus('success');
    setMessage('Placeholder: Your message would have been sent!');
     // event.currentTarget.reset(); // Uncomment when logic is implemented
    // ------------------------ 
  };

  return (
    <div className="max-w-screen-md mx-auto px-4 sm:px-6 lg:px-8 py-16 text-gray-300">
      <h1 className="text-4xl font-bold text-white mb-8 text-center">Contact Wavhaven Support</h1>
      <p className="text-center text-lg text-gray-400 -mt-4 mb-12">Need help? We're here for you.</p>

      <section className="mb-12 bg-gray-800/30 p-6 rounded-lg border border-white/10">
        <h2 className="text-xl font-semibold text-white mb-4">Before You Contact Us</h2>
        <p className="text-gray-400 mb-4">Many common questions are answered in our FAQ pages. Please check if your question is covered there:</p>
        <ul className="list-disc list-outside pl-5 space-y-1">
          <li><Link href="/faq/customer" className="text-indigo-400 hover:text-indigo-300 underline">Customer FAQ</Link></li>
          <li><Link href="/faq/producer" className="text-indigo-400 hover:text-indigo-300 underline">Producer FAQ</Link></li>
          <li><Link href="/licensing" className="text-indigo-400 hover:text-indigo-300 underline">Licensing Info</Link></li>
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-6">Get in Touch</h2>
        <p className="text-gray-400 mb-6">The best way to reach us is via our contact form below. Please provide as much detail as possible so we can assist you efficiently.</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">Your Name</Label>
              <Input type="text" id="name" name="name" required className="bg-white/5 border-white/10" />
            </div>
            <div>
              <Label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Your Email</Label>
              <Input type="email" id="email" name="email" required className="bg-white/5 border-white/10" />
            </div>
          </div>

          <div>
            <Label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-1">Subject</Label>
            <Input type="text" id="subject" name="subject" required className="bg-white/5 border-white/10" />
          </div>

          <div>
            <Label className="block text-sm font-medium text-gray-300 mb-2">I am a:</Label>
            <RadioGroup name="user_type" defaultValue="customer" className="flex flex-wrap gap-x-6 gap-y-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="customer" id="r-customer" className="border-gray-600 text-indigo-500 focus:ring-indigo-500" />
                <Label htmlFor="r-customer" className="text-gray-300">Customer</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="producer" id="r-producer" className="border-gray-600 text-indigo-500 focus:ring-indigo-500" />
                <Label htmlFor="r-producer" className="text-gray-300">Producer</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="general" id="r-general" className="border-gray-600 text-indigo-500 focus:ring-indigo-500" />
                <Label htmlFor="r-general" className="text-gray-300">General Inquiry</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="order_id" className="block text-sm font-medium text-gray-300 mb-1">Order ID (if applicable)</Label>
              <Input type="text" id="order_id" name="order_id" className="bg-white/5 border-white/10" />
            </div>
            <div>
              <Label htmlFor="track_name" className="block text-sm font-medium text-gray-300 mb-1">Track/Sound Name (if applicable)</Label>
              <Input type="text" id="track_name" name="track_name" className="bg-white/5 border-white/10" />
            </div>
          </div>

          <div>
            <Label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-1">Your Message</Label>
            <Textarea id="message" name="message" rows={6} required className="bg-white/5 border-white/10" />
          </div>

          {/* Optional: File Upload - Requires more setup */} 
           {/* <div>
             <Label htmlFor="attachment" className="block text-sm font-medium text-gray-300 mb-1">Attachment (Optional)</Label>
             <Input type="file" id="attachment" name="attachment" className="bg-white/5 border-white/10 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700" />
           </div> */} 

          <div>
            <Button type="submit" disabled={status === 'submitting'} className="w-full sm:w-auto bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50">
              {status === 'submitting' ? 'Sending...' : 'Send Message'}
            </Button>
          </div>

          {message && (
            <p className={`text-sm mt-4 ${status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {message}
            </p>
          )}
        </form>
      </section>

      <section className="text-center border-t border-white/10 pt-8">
        <h2 className="text-xl font-semibold text-white mb-4">Alternative Contact</h2>
        <p className="text-gray-400 mb-4">You can also reach us directly via email at:</p>
        {/* TODO: Replace with actual email */} 
        <a href="mailto:support@wavhaven.com" className="text-indigo-400 hover:text-indigo-300 font-medium">support@wavhaven.com</a>
        <p className="text-xs text-gray-500 mt-6">
          Our support team aims to respond within <strong>24-48 business hours</strong> (Mon-Fri).
        </p>
      </section>
    </div>
  );
} 