import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploaderProps {
  onFilesUploaded: (files: File[]) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFilesUploaded }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFilesUploaded(acceptedFiles);
  }, [onFilesUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'chemical/x-pdb': ['.pdb'],
      'application/x-cif': ['.cif'],
      'application/x-ent': ['.ent'],
      'application/gzip': ['.gz']
    }
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors",
        "p-6 cursor-pointer hover:bg-accent/5",
        isDragActive ? "border-primary bg-accent/5" : "border-muted-foreground/25"
      )}
    >
      <input {...getInputProps()} />
      <Upload className={cn(
        "h-8 w-8 mb-2 transition-colors",
        isDragActive ? "text-primary" : "text-muted-foreground"
      )} />
      <p className="text-sm font-medium">
        {isDragActive ? (
          "Drop the files here"
        ) : (
          "Drag & drop files here"
        )}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        or click to select files
      </p>
      <p className="text-[10px] text-muted-foreground/70 mt-2">
        Supports .pdb, .cif, .ent, and .gz files
      </p>
    </div>
  );
};

export default FileUploader;
