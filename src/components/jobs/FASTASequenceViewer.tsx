import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Minimize, Maximize } from "lucide-react";

interface FASTASequenceViewerProps {
  sequence: string;
  onEdit?: () => void;
  type?: 'protein' | 'dna' | 'rna';
  defaultView?: 'list' | 'grid';
  simplified?: boolean; // New prop for simplified display
}

export function FASTASequenceViewer({ 
  sequence, 
  onEdit, 
  type = 'protein',
  defaultView = 'grid',
  simplified = false
}: FASTASequenceViewerProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Always use grid view now
  const viewMode = 'grid';

  // Parse sequence based on type
  const parseSequence = () => {
    let header = "";
    let sequenceBody = "";

    if ((type === 'protein' || type === 'dna' || type === 'rna') && sequence.startsWith(">")) {
      // This is FASTA format
      const lines = sequence.split("\n");
      header = lines[0];
      sequenceBody = lines.slice(1).join("").replace(/\s+/g, "");
    } else {
      // Just a plain sequence (protein, DNA, or RNA)
      sequenceBody = sequence.replace(/\s+/g, "");
    }

    return { header, sequenceBody };
  };

  const { header, sequenceBody } = parseSequence();

  // Format the sequence as a grid with individual residues
  const formatSequenceGrid = () => {
    // Determine how many characters per row based on sequence length
    // We want to show approximately 6-10 rows for readability
    const seqLength = sequenceBody.length;
    const rowCount = Math.min(10, Math.ceil(seqLength / 60));
    const charsPerRow = Math.ceil(seqLength / rowCount / 10) * 10; // Round up to nearest 10
    
    // Create a 2D array for the grid layout
    const grid: string[][] = [];
    for (let i = 0; i < seqLength; i += charsPerRow) {
      const row = sequenceBody.substring(i, i + charsPerRow);
      const rowArray = [];
      for (let j = 0; j < row.length; j += 10) {
        rowArray.push(row.substring(j, j + 10));
      }
      grid.push(rowArray);
    }
    
    // Show FASTA header if available - but only in non-simplified view
    const headerElement = header && !simplified ? (
      <div className="text-xs mb-4 text-gray-500">{header}</div>
    ) : null;
    
    return (
      <div className="w-full overflow-x-auto">
        <div className={`text-black p-4 rounded-md font-mono ${simplified ? '' : 'border'}`}>
          {headerElement}
          
          <table className="border-collapse w-full">
            {/* Column position numbers row */}
            <thead>
              <tr>
                <th className="w-12 text-right pr-2"></th>
                {grid[0]?.map((_, colIndex) => (
                  <th 
                    key={`col-${colIndex}`} 
                    className="text-xs text-gray-500 py-2 px-2 text-center font-normal w-24"
                  >
                    {(colIndex + 1) * 10}
                  </th>
                ))}
              </tr>
            </thead>
            
            <tbody>
              {/* Grid rows */}
              {grid.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`}>
                  {/* Row label */}
                  <td className="w-12 text-right pr-3 text-xs text-gray-500 py-1">
                    {(rowIndex * charsPerRow / 10) + 1}0
                  </td>
                  
                  {/* Sequence blocks */}
                  {row.map((block, blockIndex) => (
                    <td 
                      key={`block-${rowIndex}-${blockIndex}`} 
                      className="text-center tracking-wide py-1 w-24 font-mono text-sm"
                    >
                      {block}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Get appropriate label based on type
  const getTypeLabel = () => {
    switch (type) {
      case 'dna': return 'DNA';
      case 'rna': return 'RNA';
      default: return 'Protein';
    }
  };

  // If in simplified mode, just show the grid
  if (simplified) {
    return formatSequenceGrid();
  }

  // If collapsed, show minimal view
  if (isCollapsed) {
    return (
      <div className="bg-white p-3 rounded-md text-xs border relative">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">
            {getTypeLabel()} ({sequenceBody.length} residues)
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              onClick={() => setIsCollapsed(false)}
              title="Expand"
            >
              <Maximize className="h-4 w-4" />
            </Button>
            {onEdit && (
              <Button
                variant="secondary"
                size="sm"
                className="h-6 text-xs px-2"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent event bubbling
                  onEdit();
                }}
              >
                Edit
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-3 rounded-md text-xs border relative">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium">
          {getTypeLabel()} ({sequenceBody.length} residues)
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={() => setIsCollapsed(true)}
            title="Collapse"
          >
            <Minimize className="h-4 w-4" />
          </Button>
          {onEdit && (
            <Button
              variant="secondary"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={(e) => {
                e.stopPropagation(); // Prevent event bubbling
                onEdit();
              }}
            >
              Edit
            </Button>
          )}
        </div>
      </div>
      
      <div className="font-mono">
        {formatSequenceGrid()}
      </div>
    </div>
  );
} 