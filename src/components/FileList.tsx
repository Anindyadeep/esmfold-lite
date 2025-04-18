
import React from 'react';
import { Button } from "@/components/ui/button";
import { Trash2, Eye } from "lucide-react";
import { Molecule } from '@/utils/pdbParser';

interface FileListProps {
  files: { file: File; molecule?: Molecule }[];
  onDelete: (index: number) => void;
  onSelect: (index: number) => void;
  selectedIndex: number | null;
}

const FileList: React.FC<FileListProps> = ({ files, onDelete, onSelect, selectedIndex }) => {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 overflow-auto max-h-60 rounded-md border">
      <div className="text-sm font-medium text-gray-900 bg-gray-100 dark:bg-gray-800 dark:text-white px-4 py-2 border-b">
        Uploaded Files
      </div>
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {files.map((fileData, index) => {
          const { file, molecule } = fileData;
          const isLoading = !molecule;
          const isSelected = selectedIndex === index;
          
          return (
            <li 
              key={index} 
              className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                isSelected ? 'bg-primary/10' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400' : 'bg-green-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate dark:text-white">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {isLoading ? 'Loading...' : `${molecule.atoms.length} atoms`}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => onSelect(index)}
                  disabled={isLoading}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  onClick={() => onDelete(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default FileList;
