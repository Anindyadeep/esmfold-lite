import React from 'react';
import { FASTASequenceViewer } from './jobs/FASTASequenceViewer';
import { Button } from './ui/button';
import { Maximize, X } from 'lucide-react';

interface FASTAViewerProps {
  sequence: string;
  type?: 'protein' | 'dna' | 'rna';
  onEdit?: () => void;
  onClose?: () => void;
  onExpand?: () => void;
}

/**
 * A simple component to display FASTA sequences in grid format
 * without additional headers or labels
 */
export function FASTAViewer({ 
  sequence, 
  type = 'protein', 
  onEdit, 
  onClose,
  onExpand
}: FASTAViewerProps) {
  return (
    <div className="w-full border rounded-md">
      {/* Optional toolbar at the top-right */}
      {(onExpand || onClose || onEdit) && (
        <div className="flex justify-end p-2 gap-1">
          {onEdit && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onEdit}
              className="h-7 w-7 p-0"
            >
              Edit
            </Button>
          )}
          {onExpand && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onExpand}
              className="h-7 w-7 p-0"
            >
              <Maximize className="h-4 w-4" />
            </Button>
          )}
          {onClose && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="h-7 w-7 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
      
      {/* Just the sequence viewer itself with minimal styling */}
      <div className="p-2">
        <FASTASequenceViewer 
          sequence={sequence} 
          type={type}
          simplified={true}
        />
      </div>
    </div>
  );
} 