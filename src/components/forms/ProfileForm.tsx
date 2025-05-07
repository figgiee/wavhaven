'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // For Bio
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { updateUserProfile } from '@/server-actions/userActions'; // Import the server action
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Schema for profile form validation (subset of updateUserProfile schema, depends on what we fetch)
const profileFormSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").max(100),
  storeName: z.string().max(100).optional(),
  bio: z.string().max(1000).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

// Props for the form, including the initial data to populate it
interface ProfileFormProps {
  initialData: {
    name: string | null;
    storeName: string | null;
    bio: string | null;
  };
  isProducer: boolean; // To conditionally show producer fields
}

export function ProfileForm({ initialData, isProducer }: ProfileFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: initialData.name || '',
      storeName: initialData.storeName || '',
      bio: initialData.bio || '',
    },
  });

  async function onSubmit(values: ProfileFormValues) {
    setIsSubmitting(true);
    try {
      const result = await updateUserProfile({
        name: values.name,
        // Only send storeName and bio if the user is a producer
        storeName: isProducer ? values.storeName : undefined,
        bio: isProducer ? values.bio : undefined,
      });

      if (result.success) {
        toast.success('Profile updated successfully!');
        router.refresh(); // Refresh page to show updated data
      } else {
        toast.error(result.error || 'Failed to update profile.');
      }
    } catch (error) {
      console.error("Error submitting profile update:", error);
      toast.error('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>Update your display name and producer details.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              {...form.register('name')}
              placeholder="Your display name"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Conditionally render producer fields */}
          {isProducer && (
            <>
              <div className="space-y-2">
                <Label htmlFor="storeName">Store Name</Label>
                <Input
                  id="storeName"
                  {...form.register('storeName')}
                  placeholder="Your producer store name"
                />
                {form.formState.errors.storeName && (
                  <p className="text-sm text-red-600">{form.formState.errors.storeName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  {...form.register('bio')}
                  placeholder="Tell us about yourself..."
                  rows={4}
                />
                {form.formState.errors.bio && (
                  <p className="text-sm text-red-600">{form.formState.errors.bio.message}</p>
                )}
              </div>
            </>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 