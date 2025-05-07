'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner'; // Using sonner for notifications
import { setUserRole } from '@/server-actions/userActions';
import { UserRole } from '@prisma/client';

// Define the schema for the form using Zod
const formSchema = z.object({
  role: z.enum([UserRole.CUSTOMER, UserRole.PRODUCER]),
});

type FormValues = z.infer<typeof formSchema>;

export default function RoleSelectorForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: UserRole.CUSTOMER, // Default selection
    },
  });

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      const result = await setUserRole(values.role);
      if (result.success) {
        toast.success('Role selected successfully!');
        // Redirect based on role or to a general dashboard/home page
        if (values.role === UserRole.PRODUCER) {
          router.push('/producer/dashboard'); // Example redirect for producer
        } else {
          router.push('/'); // Example redirect for customer
        }
        router.refresh(); // Refresh server components
      } else {
        toast.error(result.error || 'Failed to set role.');
      }
    } catch (error) {
      console.error("Error submitting role selection:", error);
      toast.error('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <RadioGroup
        defaultValue={form.getValues('role')}
        onValueChange={(value: UserRole) => form.setValue('role', value)}
        className="space-y-2"
      >
        <div className="flex items-center space-x-2 p-4 border rounded-md">
          <RadioGroupItem value={UserRole.CUSTOMER} id="customer" />
          <Label htmlFor="customer" className="flex-1 cursor-pointer">
            <span className="font-medium">Customer</span>
            <p className="text-sm text-muted-foreground">
              Browse, purchase, and download licenses for tracks.
            </p>
          </Label>
        </div>
        <div className="flex items-center space-x-2 p-4 border rounded-md">
          <RadioGroupItem value={UserRole.PRODUCER} id="producer" />
          <Label htmlFor="producer" className="flex-1 cursor-pointer">
            <span className="font-medium">Producer</span>
            <p className="text-sm text-muted-foreground">
              Upload your tracks and sell licenses to customers.
            </p>
          </Label>
        </div>
      </RadioGroup>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Saving...' : 'Continue'}
      </Button>
    </form>
  );
} 