'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UploadCloud } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // For Bio
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { updateUserProfile, UserProfileUpdatePayload } from '@/server-actions/users/userMutations'; // Import the server action and type
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator'; // Import Separator

// Updated schema to include social links
const profileFormSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").max(100),
  storeName: z.string().max(100).optional(),
  bio: z.string().max(1000).optional(),
  // Add optional social links (using .url() for basic validation)
  websiteUrl: z.string().url("Invalid URL").or(z.literal('')).optional(),
  twitterUrl: z.string().url("Invalid URL").or(z.literal('')).optional(),
  instagramUrl: z.string().url("Invalid URL").or(z.literal('')).optional(),
  youtubeUrl: z.string().url("Invalid URL").or(z.literal('')).optional(),
  soundcloudUrl: z.string().url("Invalid URL").or(z.literal('')).optional(),
  tiktokUrl: z.string().url("Invalid URL").or(z.literal('')).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

// Updated props to include social links in initialData
interface ProfileFormProps {
  initialData: {
    name: string | null;
    profileImageUrl?: string | null;
    storeName: string | null;
    bio: string | null;
    bannerImageUrl?: string | null;
    websiteUrl?: string | null;
    twitterUrl?: string | null;
    instagramUrl?: string | null;
    youtubeUrl?: string | null;
    soundcloudUrl?: string | null;
    tiktokUrl?: string | null;
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
      // Set defaults for social links
      websiteUrl: initialData.websiteUrl || '',
      twitterUrl: initialData.twitterUrl || '',
      instagramUrl: initialData.instagramUrl || '',
      youtubeUrl: initialData.youtubeUrl || '',
      soundcloudUrl: initialData.soundcloudUrl || '',
      tiktokUrl: initialData.tiktokUrl || '',
    },
    mode: 'onChange', // Validate on change for better UX with URLs
  });

  async function onSubmit(values: ProfileFormValues) {
    setIsSubmitting(true);
    try {
      // Construct payload matching server action
      const payload: UserProfileUpdatePayload = {
        name: values.name,
        storeName: isProducer ? values.storeName : undefined,
        bio: isProducer ? values.bio : undefined,
        // Include social links only if producer
        websiteUrl: isProducer ? values.websiteUrl : undefined,
        twitterUrl: isProducer ? values.twitterUrl : undefined,
        instagramUrl: isProducer ? values.instagramUrl : undefined,
        youtubeUrl: isProducer ? values.youtubeUrl : undefined,
        soundcloudUrl: isProducer ? values.soundcloudUrl : undefined,
        tiktokUrl: isProducer ? values.tiktokUrl : undefined,
      };

      const result = await updateUserProfile(payload);

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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          {/* --- Profile Picture Section --- */}
          <div className="space-y-3">
            <Label>Profile Picture</Label>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border">
                <AvatarImage src={initialData.profileImageUrl ?? undefined} alt="Profile picture" />
                <AvatarFallback className="text-xl">{initialData.name?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <Button type="button" variant="outline" disabled> {/* Disabled for now */}
                <UploadCloud className="mr-2 h-4 w-4" />
                Change Picture
              </Button>
            </div>
            {/* TODO: Add file input and upload logic later */}
          </div>
          
          <Separator />

          {/* --- Basic Info Section --- */}
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              {...form.register('name')}
              placeholder="Your display name"
              aria-describedby={form.formState.errors.name ? "name-error" : undefined}
            />
            {form.formState.errors.name && (
              <p id="name-error" className="text-sm text-red-600" role="alert">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* --- Producer Specific Section --- */}
          {isProducer && (
            <>
              <Separator />
              {/* Banner Image Section */}
              <div className="space-y-3">
                  <Label>Banner Image</Label>
                  <div className="aspect-[3/1] w-full bg-muted rounded-md overflow-hidden relative border">
                    {initialData.bannerImageUrl ? (
                      <Image 
                        src={initialData.bannerImageUrl} 
                        alt="Profile banner" 
                        fill 
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-neutral-700/50">
                          <p className="text-sm text-neutral-400">No banner image set</p>
                      </div>
                    )}
                  </div>
                  <Button type="button" variant="outline" disabled> {/* Disabled for now */}
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Change Banner
                  </Button>
                  {/* TODO: Add file input and upload logic later */}
              </div>

              <Separator />

              {/* Store Name Input */}
              <div className="space-y-2">
                <Label htmlFor="storeName">Store Name</Label>
                <Input
                  id="storeName"
                  {...form.register('storeName')}
                  placeholder="Your producer store name"
                  aria-describedby={form.formState.errors.storeName ? "storeName-error" : undefined}
                />
                {form.formState.errors.storeName && (
                  <p id="storeName-error" className="text-sm text-red-600" role="alert">{form.formState.errors.storeName.message}</p>
                )}
              </div>

              {/* Bio Textarea */}
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  {...form.register('bio')}
                  placeholder="Tell us about yourself..."
                  rows={4}
                  aria-describedby={form.formState.errors.bio ? "bio-error" : undefined}
                />
                {form.formState.errors.bio && (
                  <p id="bio-error" className="text-sm text-red-600" role="alert">{form.formState.errors.bio.message}</p>
                )}
              </div>
              
              <Separator />

              <fieldset className="space-y-6 pt-2">
                <legend className="text-lg font-medium mb-2">Social Links</legend>
                
                {/* Website URL */}
                <div className="space-y-2">
                   <Label htmlFor="websiteUrl">Website URL</Label>
                   <Input id="websiteUrl" {...form.register('websiteUrl')} placeholder="https://yourwebsite.com" aria-describedby={form.formState.errors.websiteUrl ? "websiteUrl-error" : undefined} />
                   {form.formState.errors.websiteUrl && <p id="websiteUrl-error" className="text-sm text-red-600" role="alert">{form.formState.errors.websiteUrl.message}</p>}
                </div>
                {/* Twitter URL */}
                <div className="space-y-2">
                   <Label htmlFor="twitterUrl">Twitter URL</Label>
                   <Input id="twitterUrl" {...form.register('twitterUrl')} placeholder="https://twitter.com/yourhandle" aria-describedby={form.formState.errors.twitterUrl ? "twitterUrl-error" : undefined} />
                   {form.formState.errors.twitterUrl && <p id="twitterUrl-error" className="text-sm text-red-600" role="alert">{form.formState.errors.twitterUrl.message}</p>}
                </div>
                {/* Instagram URL */}
                <div className="space-y-2">
                   <Label htmlFor="instagramUrl">Instagram URL</Label>
                   <Input id="instagramUrl" {...form.register('instagramUrl')} placeholder="https://instagram.com/yourhandle" aria-describedby={form.formState.errors.instagramUrl ? "instagramUrl-error" : undefined} />
                   {form.formState.errors.instagramUrl && <p id="instagramUrl-error" className="text-sm text-red-600" role="alert">{form.formState.errors.instagramUrl.message}</p>}
                </div>
                {/* YouTube URL */}
                <div className="space-y-2">
                   <Label htmlFor="youtubeUrl">YouTube URL</Label>
                   <Input id="youtubeUrl" {...form.register('youtubeUrl')} placeholder="https://youtube.com/c/yourchannel" aria-describedby={form.formState.errors.youtubeUrl ? "youtubeUrl-error" : undefined} />
                   {form.formState.errors.youtubeUrl && <p id="youtubeUrl-error" className="text-sm text-red-600" role="alert">{form.formState.errors.youtubeUrl.message}</p>}
                </div>
                {/* SoundCloud URL */}
                <div className="space-y-2">
                   <Label htmlFor="soundcloudUrl">SoundCloud URL</Label>
                   <Input id="soundcloudUrl" {...form.register('soundcloudUrl')} placeholder="https://soundcloud.com/yourprofile" aria-describedby={form.formState.errors.soundcloudUrl ? "soundcloudUrl-error" : undefined} />
                   {form.formState.errors.soundcloudUrl && <p id="soundcloudUrl-error" className="text-sm text-red-600" role="alert">{form.formState.errors.soundcloudUrl.message}</p>}
                </div>
                {/* TikTok URL */}
                <div className="space-y-2">
                   <Label htmlFor="tiktokUrl">TikTok URL</Label>
                   <Input id="tiktokUrl" {...form.register('tiktokUrl')} placeholder="https://tiktok.com/@yourhandle" aria-describedby={form.formState.errors.tiktokUrl ? "tiktokUrl-error" : undefined} />
                   {form.formState.errors.tiktokUrl && <p id="tiktokUrl-error" className="text-sm text-red-600" role="alert">{form.formState.errors.tiktokUrl.message}</p>}
                </div>
              </fieldset>
            </>
          )}

          <Separator />

          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 
