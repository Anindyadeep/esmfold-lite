import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVisualizeStore } from '@/store/visualizeStore';
import { toast } from 'sonner';

// Define the maximum number of PDB uploads
const MAX_UPLOADS = 3;

interface FileUploaderProps {
  onFilesUploaded: (files: File[]) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFilesUploaded }) => {
  const { canAddMoreFiles, getCurrentUploadCount } = useVisualizeStore();
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Check if adding these files would exceed the limit
    const currentCount = getCurrentUploadCount();
    
    if (currentCount + acceptedFiles.length > MAX_UPLOADS) {
      toast.error(`You can only upload up to ${MAX_UPLOADS} PDB files. You currently have ${currentCount} file(s).`);
      return;
    }
    
    onFilesUploaded(acceptedFiles);
  }, [onFilesUploaded, getCurrentUploadCount]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'chemical/x-pdb': ['.pdb'],
      'application/x-cif': ['.cif'],
      'application/x-ent': ['.ent'],
      'application/gzip': ['.gz']
    },
    disabled: !canAddMoreFiles()
  });

  // Check if file uploads are disabled
  const isUploadDisabled = !canAddMoreFiles();

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors",
        "p-6 cursor-pointer hover:bg-accent/5",
        isDragActive ? "border-primary bg-accent/5" : "border-muted-foreground/25",
        isUploadDisabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
      )}
    >
      <input {...getInputProps()} disabled={isUploadDisabled} />
      <Upload className={cn(
        "h-8 w-8 mb-2 transition-colors",
        isDragActive ? "text-primary" : "text-muted-foreground"
      )} />
      <p className="text-sm font-medium">
        {isDragActive ? (
          "Drop the files here"
        ) : isUploadDisabled ? (
          `Maximum of ${MAX_UPLOADS} files reached`
        ) : (
          "Drag & drop files here"
        )}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        {isUploadDisabled ? (
          "Delete existing files to upload more"
        ) : (
          "or click to select files"
        )}
      </p>
      <p className="text-[10px] text-muted-foreground/70 mt-2">
        Supports .pdb, .cif, .ent, and .gz files
      </p>
      {getCurrentUploadCount() > 0 && (
        <div className="absolute top-1 right-2">
          <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
            {getCurrentUploadCount()}/{MAX_UPLOADS} files
          </span>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
