'use client';

import * as React from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';

interface DropzoneProps {
  onDrop: (files: File[]) => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
  className?: string;
  children?: React.ReactNode;
}

export function Dropzone({
  onDrop,
  accept,
  maxSize,
  className,
  children,
}: DropzoneProps) {
  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
    fileRejections,
  } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: true,
  });

  return (
    <div className="space-y-2 w-full h-full">
      <div
        {...getRootProps()}
        className={cn(
          'w-full h-full flex items-center justify-center transition-colors rounded-lg',
          'cursor-pointer',
          isDragActive ? 'bg-indigo-900/20' : '',
          isDragReject ? 'bg-red-900/20' : '',
          className
        )}
      >
        <input {...getInputProps()} />
        <div className="text-center w-full">
          {children || (
            <>
              {isDragActive ? (
                <p className="text-indigo-400">Drop the file here</p>
              ) : (
                <div>
                  <p className="text-indigo-400 mb-1">
                    Choose file(s) or drag and drop
                  </p>
                  {accept && (
                    <p className="text-xs text-gray-500">
                      Accepted files: {Object.values(accept).flat().join(', ')}
                    </p>
                  )}
                  {maxSize && (
                    <p className="text-xs text-gray-500">
                      Max size: {(maxSize / 1024 / 1024).toFixed(0)}MB
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {fileRejections.length > 0 && (
        <div className="text-sm text-red-500">
          {fileRejections.map(({ file, errors }) => (
            <div key={file.name}>
              {errors.map((error) => (
                <p key={error.code}>{error.message}</p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 