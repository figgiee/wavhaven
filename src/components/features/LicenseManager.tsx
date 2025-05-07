'use client';

import * as React from 'react';
import { useForm, SubmitHandler, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Assuming Select is added
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { License, LicenseType } from '@prisma/client'; // Import Prisma types
import { createOrUpdateLicense } from '@/server-actions/licenseActions';

// Schema for a single license form entry
const LicenseFormSchema = z.object({
  licenseId: z.string().optional(), // Hidden input for existing license ID
  type: z.nativeEnum(LicenseType), 
  name: z.string().min(1, 'License name is required'),
  price: z.coerce.number().positive('Price must be positive'),
  description: z.string().optional(),
});

// Schema for the whole manager form (array of licenses)
const ManagerFormSchema = z.object({
  licenses: z.array(LicenseFormSchema),
});

type ManagerFormValues = z.infer<typeof ManagerFormSchema>;

interface LicenseManagerProps {
  trackId: string;
  existingLicenses: License[];
}

export default function LicenseManager({ trackId, existingLicenses }: LicenseManagerProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<ManagerFormValues>({
    resolver: zodResolver(ManagerFormSchema),
    defaultValues: {
      licenses: existingLicenses.map(l => ({ // Map existing data to form shape
        licenseId: l.id,
        type: l.type,
        name: l.name,
        price: l.price,
        description: l.description || '',
      })) || [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'licenses',
  });

  // Function to handle saving a single license (either new or update)
  const handleSaveLicense = async (index: number) => {
    const licenseData = form.getValues(`licenses.${index}`);
    setIsSubmitting(true);
    try {
        // Prepare data for the server action, ensuring licenseId is omitted if not present
        const payload: Omit<LicenseInput, 'trackId'> & { trackId: string } = {
            type: licenseData.type,
            name: licenseData.name,
            price: licenseData.price,
            description: licenseData.description,
            trackId: trackId, // Add trackId
        };
        
        // Only include licenseId if it exists (for updates)
        if (licenseData.licenseId) {
            payload.licenseId = licenseData.licenseId;
        }
        
        const result = await createOrUpdateLicense(payload);

        if (result.success && result.licenseId) {
            toast.success(`License "${licenseData.name}" saved successfully!`);
            // Update the form state with the new/updated ID if necessary
            // Check if the original data didn't have an ID OR if the returned ID is different
            if (!licenseData.licenseId || licenseData.licenseId !== result.licenseId) { 
                update(index, { ...licenseData, licenseId: result.licenseId });
            }
            router.refresh(); // Refresh server components to reflect changes
        } else {
            toast.error(result.error || 'Failed to save license.');
        }
    } catch (error) {
        console.error("Error saving license:", error);
        toast.error('An unexpected error occurred.');
    } finally {
        setIsSubmitting(false);
    }
  };

  // TODO: Implement delete license functionality
  const handleDeleteLicense = async (index: number) => {
      const licenseIdToDelete = form.getValues(`licenses.${index}.licenseId`);
      if (!licenseIdToDelete) {
          // If it's a newly added field without an ID, just remove from form
          remove(index);
          return;
      }
      // Confirmation dialog is recommended here
      toast.info(`Deletion for license ID ${licenseIdToDelete} not implemented yet.`);
      // Call a deleteLicense server action when implemented
      // If successful, remove(index) and router.refresh()
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Licenses</CardTitle>
        <CardDescription>Define the licenses available for this track.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {fields.map((field, index) => (
            <div key={field.id} className="border p-4 rounded-md space-y-4 relative">
              <input type="hidden" {...form.register(`licenses.${index}.licenseId`)} />
              <input type="hidden" value={trackId} {...form.register(`licenses.${index}.trackId` as any)} /> {/* Hacky, better way? */} 
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {/* License Type Select */} 
                 <div className="grid gap-2">
                     <Label htmlFor={`licenses.${index}.type`}>License Type</Label>
                     <Select 
                        defaultValue={field.type} 
                        onValueChange={(value: LicenseType) => form.setValue(`licenses.${index}.type`, value)}
                     >
                        <SelectTrigger id={`licenses.${index}.type`}>
                            <SelectValue placeholder="Select type..." />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.values(LicenseType).map((type) => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 </div>
                 {/* License Name */} 
                 <div className="grid gap-2">
                    <Label htmlFor={`licenses.${index}.name`}>License Name</Label>
                    <Input id={`licenses.${index}.name`} {...form.register(`licenses.${index}.name`)} placeholder="e.g., Basic Lease" />
                    {form.formState.errors.licenses?.[index]?.name && <p className="text-red-500 text-sm">{form.formState.errors.licenses[index]?.name?.message}</p>}
                 </div>
              </div>
              {/* Price */} 
              <div className="grid gap-2">
                 <Label htmlFor={`licenses.${index}.price`}>Price (USD)</Label>
                 <Input id={`licenses.${index}.price`} type="number" step="0.01" {...form.register(`licenses.${index}.price`)} placeholder="29.99" />
                 {form.formState.errors.licenses?.[index]?.price && <p className="text-red-500 text-sm">{form.formState.errors.licenses[index]?.price?.message}</p>}
              </div>
              {/* Description */} 
              <div className="grid gap-2">
                 <Label htmlFor={`licenses.${index}.description`}>Description (Optional)</Label>
                 <Textarea id={`licenses.${index}.description`} {...form.register(`licenses.${index}.description`)} placeholder="Usage rights, file formats included..." />
              </div>
              {/* Action Buttons */} 
              <div className="flex justify-end gap-2 pt-2">
                 <Button type="button" variant="outline" size="sm" onClick={() => handleSaveLicense(index)} disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save License'}
                 </Button>
                 <Button type="button" variant="destructive" size="sm" onClick={() => handleDeleteLicense(index)} disabled={isSubmitting}>
                    Delete
                 </Button>
              </div>
            </div>
          ))}
        </div>

        <Button 
          type="button" 
          variant="secondary" 
          className="mt-6"
          onClick={() => append({ type: LicenseType.BASIC, name: '', price: 0, description: '' })} // Add new empty license form
        >
          Add New License Type
        </Button>
      </CardContent>
    </Card>
  );
} 