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
  getResidueColor?: (index: number) => string; // Function to get color for a residue
  onResidueClick?: (index: number) => void;
  onResidueHover?: (index: number | null) => void;
}

export function SequenceViewer({ 
  sequence, 
  residueData,
  getResidueColor,
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
    <div className="w-full overflow-x-auto rounded-md bg-muted/30 p-3">
      <div className="flex flex-wrap font-mono text-sm">
        {/* Sequence numbers */}
        <div className="flex w-full mb-2">
          {Array.from({ length: Math.ceil(sequence.length / 10) }).map((_, i) => (
            <span key={i} className="inline-block w-[100px] text-center text-xs text-muted-foreground">
              {(i + 1) * 10}
            </span>
          ))}
        </div>
        
        {/* Sequence with legend */}
        <div className="flex flex-col w-full">
          {/* Sequence display */}
          <div className="flex flex-wrap mb-4">
            {sequence.split('').map((residue, index) => (
              <button
                key={index}
                onClick={() => handleResidueClick(index)}
                onMouseEnter={() => handleResidueHover(index)}
                onMouseLeave={() => handleResidueHover(null)}
                style={{
                  backgroundColor: getResidueColor && !hoveredResidue && selectedResidue !== index 
                    ? getResidueColor(index) 
                    : undefined
                }}
                className={cn(
                  "w-[14px] h-[24px] text-center transition-colors cursor-pointer text-xs rounded-sm font-medium flex items-center justify-center",
                  hoveredResidue === index && "bg-accent/80 text-accent-foreground ring-1 ring-accent",
                  selectedResidue === index && "bg-primary text-primary-foreground font-bold ring-2 ring-primary/50",
                  !hoveredResidue && selectedResidue !== index && getResidueColor 
                    ? "hover:ring-1 hover:ring-primary/30 hover:brightness-90" 
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
                title={getResidueTooltip(residue, index)}
              >
                {residue}
              </button>
            ))}
          </div>
          
          {/* Legend */}
          {getResidueColor && (
            <div className="flex flex-wrap gap-3 text-xs mt-2 border-t pt-2 border-muted">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#ff8f8f' }}></div>
                <span>Hydrophobic</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#8fce8f' }}></div>
                <span>Polar</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#ff725c' }}></div>
                <span>Acidic</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#80b1d3' }}></div>
                <span>Basic</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#fdb462' }}></div>
                <span>Special</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#cccccc' }}></div>
                <span>Other</span>
              </div>
            </div>
          )}
          
          {/* Help text */}
          <div className="text-xs text-muted-foreground mt-2">
            Click on residue to view in licorice representation • Hover to highlight
          </div>
        </div>
      </div>
    </div>
  );
} 