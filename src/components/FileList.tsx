import React from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { File, X } from "lucide-react";
import { cn } from '@/lib/utils';

interface FileListProps {
  files: { file: File }[];
  onDelete: (index: number) => void;
  onSelect: (index: number) => void;
  selectedIndex: number | null;
}

const FileList: React.FC<FileListProps> = ({
  files,
  onDelete,
  onSelect,
  selectedIndex,
}) => {
  if (files.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        No files uploaded
      </div>
    );
  }

  return (
    <ScrollArea className="h-[200px] pr-4">
      <div className="space-y-2">
        {files.map((file, index) => (
          <div
            key={`${file.file.name}-${index}`}
            className={cn(
              "group flex items-center justify-between rounded-md border px-3 py-2 transition-colors",
              selectedIndex === index
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            )}
          >
            <button
              className="flex items-center gap-2 text-sm truncate"
              onClick={() => onSelect(index)}
            >
              <File className="h-4 w-4 shrink-0" />
              <span className="truncate">{file.file.name}</span>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(index);
              }}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default FileList;
