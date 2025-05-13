'use client';

import { useState, DragEvent } from 'react';
import { toast } from 'sonner';

interface UseFileDropOptions {
  fieldName: string;
  acceptedTypes: string[];
  maxSize: number;
  typeLabel: string;
  setValue: (fieldName: string, files: FileList | undefined, options?: { shouldValidate: boolean }) => void;
  trigger: (fieldName: string) => Promise<boolean>;
  onSuccess?: (file: File) => void;
}

export function useFileDrop(options: UseFileDropOptions) {
  const { fieldName, acceptedTypes, maxSize, typeLabel, setValue, trigger, onSuccess } = options;
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length === 1) {
      const file = files[0];
      if (!acceptedTypes.includes(file.type)) {
        toast.error(`Invalid ${typeLabel} type. Accepted: ${acceptedTypes.join(', ')}`);
        return;
      }
      if (file.size > maxSize) {
        toast.error(`Max ${typeLabel} size is ${maxSize / 1024 / 1024}MB.`);
        return;
      }
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      setValue(fieldName, dataTransfer.files, { shouldValidate: true });
      trigger(fieldName);
      toast.success(`${typeLabel} selected: ${file.name}`);
      onSuccess?.(file);
    } else if (files.length > 1) {
      toast.error(`Please drop only one ${typeLabel} file.`);
    } else {
      toast.error(`Failed to get dropped ${typeLabel} file.`);
    }
  };

  return { isDragging, handleDragEnter, handleDragLeave, handleDragOver, handleDrop };
} 