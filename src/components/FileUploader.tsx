
import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Upload, File } from "lucide-react";

interface FileUploaderProps {
  onFilesUploaded: (files: File[]) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFilesUploaded }) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files).filter(
        file => file.name.endsWith('.pdb')
      );
      onFilesUploaded(filesArray);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files).filter(
        file => file.name.endsWith('.pdb')
      );
      onFilesUploaded(filesArray);
    }
  };

  const onButtonClick = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  return (
    <div className="w-full">
      <div 
        className={`
          flex flex-col items-center justify-center 
          w-full h-32 border-2 border-dashed 
          rounded-lg cursor-pointer
          transition-colors
          ${dragActive ? 'border-primary bg-primary/10' : 'border-gray-300 bg-gray-50 dark:bg-gray-800 dark:border-gray-600'}
          hover:border-primary hover:bg-primary/5
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-gray-500 dark:text-gray-400">
          <Upload className="w-8 h-8 mb-3" />
          <p className="mb-2 text-sm">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs">.pdb files only</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdb"
          onChange={handleChange}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default FileUploader;
