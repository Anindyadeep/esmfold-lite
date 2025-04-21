import React, { useState } from 'react';
import { cn } from '@/lib/utils';

// Add an interface for residue metadata
export interface ResidueInfo {
  id: number;      // PDB residue ID
  code: string;    // One-letter code
  name?: string;   // Three-letter code (optional)
  chain?: string;  // Chain ID (optional)
}

interface SequenceViewerProps {
  sequence: string;
  residueData?: ResidueInfo[]; // Optional metadata about each residue
  onResidueClick?: (index: number) => void;
  onResidueHover?: (index: number | null) => void;
}

export function SequenceViewer({ 
  sequence, 
  residueData,
  onResidueClick, 
  onResidueHover 
}: SequenceViewerProps) {
  const [selectedResidue, setSelectedResidue] = useState<number | null>(null);
  const [hoveredResidue, setHoveredResidue] = useState<number | null>(null);

  const handleResidueClick = (index: number) => {
    setSelectedResidue(index);
    if (onResidueClick) {
      onResidueClick(index);
    }
  };

  const handleResidueHover = (index: number | null) => {
    setHoveredResidue(index);
    if (onResidueHover) {
      onResidueHover(index);
    }
  };

  // Generate tooltip text for a residue
  const getResidueTooltip = (residue: string, index: number): string => {
    if (residueData && residueData[index]) {
      const info = residueData[index];
      let tooltip = '';
      
      // Add name if available
      if (info.name) {
        tooltip += `${info.name} (${info.code})`;
      } else {
        tooltip += info.code;
      }
      
      // Add ID
      tooltip += ` ${info.id}`;
      
      // Add chain if available
      if (info.chain) {
        tooltip += ` Chain ${info.chain}`;
      }
      
      return tooltip;
    }
    
    // Default tooltip if no metadata
    return `${residue}${index + 1}`;
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex flex-wrap font-mono text-sm">
        {/* Sequence numbers */}
        <div className="flex w-full mb-1">
          {Array.from({ length: Math.ceil(sequence.length / 10) }).map((_, i) => (
            <span key={i} className="inline-block w-[100px] text-center text-xs text-muted-foreground">
              {(i + 1) * 10}
            </span>
          ))}
        </div>
        
        {/* Sequence */}
        <div className="flex flex-wrap">
          {sequence.split('').map((residue, index) => (
            <button
              key={index}
              onClick={() => handleResidueClick(index)}
              onMouseEnter={() => handleResidueHover(index)}
              onMouseLeave={() => handleResidueHover(null)}
              className={cn(
                "w-[10px] h-[20px] text-center transition-colors cursor-pointer",
                hoveredResidue === index && "bg-accent/50 text-accent-foreground",
                selectedResidue === index && "bg-accent text-accent-foreground font-bold",
                "hover:bg-accent hover:text-accent-foreground"
              )}
              title={getResidueTooltip(residue, index)}
            >
              {residue}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
} 