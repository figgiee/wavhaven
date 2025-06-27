'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { FileManagement } from './FileManagement';

// This type should be extracted and shared with the page component later
type TrackData = {
    id: string;
    title: string;
    description: string | null;
    bpm: number | null;
    key: string | null;
    artworkUrl: string | null;
    isPublished: boolean;
    tags: { name: string }[];
    licenses: { id: string; name: string; price: any; }[];
    files: { id: string; fileType: string; storagePath: string; }[];
};

interface EditTrackFormProps {
  track: TrackData;
}

// --- Zod Schema for the Edit Form ---
const editTrackSchema = z.object({
  title: z.string().min(1, "Track title is required."),
  description: z.string().optional(),
  bpm: z.preprocess(
    (val) => (val === '' ? null : Number(val)),
    z.number().int().positive().nullable().optional(),
  ),
  key: z.string().optional(),
  tags: z.string().optional(), // Will be a comma-separated string in the form
});

type EditTrackFormValues = z.infer<typeof editTrackSchema>;

export function EditTrackForm({ track }: EditTrackFormProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<EditTrackFormValues>({
        resolver: zodResolver(editTrackSchema),
        defaultValues: {
            title: track.title,
            description: track.description ?? '',
            bpm: track.bpm ?? undefined,
            key: track.key ?? '',
            tags: track.tags.map(t => t.name).join(', '),
        },
    });

    const onSubmit = async (data: EditTrackFormValues) => {
        setIsSubmitting(true);
        toast.info("Saving changes...");
        console.log("Form Data to be saved:", data);
        
        // TODO: Call the update server action
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
        
        toast.success("Track updated successfully!");
        setIsSubmitting(false);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Accordion type="multiple" defaultValue={['details']} className="w-full">
                    {/* Details Section */}
                    <AccordionItem value="details">
                         <AccordionTrigger className="text-lg font-semibold">Track Details</AccordionTrigger>
                         <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                             <FormField
                                 control={form.control}
                                 name="title"
                                 render={({ field }) => (
                                     <FormItem className="md:col-span-2">
                                         <FormLabel>Title</FormLabel>
                                         <FormControl>
                                             <Input placeholder="e.g., Sunset Drive" {...field} />
                                         </FormControl>
                                         <FormMessage />
                                     </FormItem>
                                 )}
                             />
                             <FormField
                                 control={form.control}
                                 name="description"
                                 render={({ field }) => (
                                     <FormItem className="md:col-span-2">
                                         <FormLabel>Description</FormLabel>
                                         <FormControl>
                                             <Textarea placeholder="Describe your track..." {...field} value={field.value ?? ''} />
                                         </FormControl>
                                         <FormMessage />
                                     </FormItem>
                                 )}
                             />
                             <FormField
                                 control={form.control}
                                 name="bpm"
                                 render={({ field }) => (
                                     <FormItem>
                                         <FormLabel>BPM</FormLabel>
                                         <FormControl>
                                             <Input type="number" placeholder="120" {...field} value={field.value ?? ''} />
                                         </FormControl>
                                         <FormMessage />
                                     </FormItem>
                                 )}
                             />
                             <FormField
                                 control={form.control}
                                 name="key"
                                 render={({ field }) => (
                                     <FormItem>
                                         <FormLabel>Key</FormLabel>
                                         <FormControl>
                                             <Input placeholder="e.g., C Major" {...field} value={field.value ?? ''} />
                                         </FormControl>
                                         <FormMessage />
                                     </FormItem>
                                 )}
                             />
                              <FormField
                                 control={form.control}
                                 name="tags"
                                 render={({ field }) => (
                                     <FormItem className="md:col-span-2">
                                         <FormLabel>Tags</FormLabel>
                                         <FormControl>
                                             <Input placeholder="e.g., lofi, chill, hip-hop" {...field} />
                                         </FormControl>
                                         <FormDescription>
                                             Comma-separated tags to help users find your track.
                                         </FormDescription>
                                         <FormMessage />
                                     </FormItem>
                                 )}
                             />
                         </AccordionContent>
                    </AccordionItem>
                    
                    {/* Files Section */}
                    <AccordionItem value="files">
                        <AccordionTrigger className="text-lg font-semibold">Files</AccordionTrigger>
                        <AccordionContent>
                           <FileManagement trackId={track.id} files={track.files} />
                        </AccordionContent>
                    </AccordionItem>
                    
                    {/* Licenses Section */}
                    <AccordionItem value="licenses">
                        <AccordionTrigger className="text-lg font-semibold">Pricing & Licenses</AccordionTrigger>
                        <AccordionContent>
                           <p>License editing UI will go here.</p>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
                
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
            </form>
        </Form>
    );
} 