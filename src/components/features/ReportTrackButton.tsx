'use client';

import React, { useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Flag } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { reportTrack } from '@/server-actions/moderationActions';

const reportFormSchema = z.object({
  reason: z.string().min(10, "Please provide a more detailed reason.").max(1000),
});

type ReportFormValues = z.infer<typeof reportFormSchema>;

interface ReportTrackButtonProps {
    trackId: string;
}

export function ReportTrackButton({ trackId }: ReportTrackButtonProps) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const form = useForm<ReportFormValues>({
        resolver: zodResolver(reportFormSchema),
        defaultValues: {
            reason: '',
        },
    });

    const onSubmit = (data: ReportFormValues) => {
        startTransition(async () => {
            const result = await reportTrack({ trackId, reason: data.reason });
            if (result.success) {
                toast.success("Track reported. Thank you for your feedback.");
                setOpen(false);
                form.reset();
            } else {
                toast.error("Failed to report track", { description: result.error });
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                    <Flag className="mr-2 h-4 w-4" />
                    Report
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Report Track</DialogTitle>
                    <DialogDescription>
                        Please provide a reason for reporting this track. Your feedback helps us keep the community safe.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="reason"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Reason</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="e.g., Copyright infringement, inappropriate content..."
                                            rows={5}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary" disabled={isPending}>
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? 'Submitting...' : 'Submit Report'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
} 