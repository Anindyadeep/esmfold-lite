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

  // Non-interactive: no selection or hover


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
        {/* Sequence display (static) */}
          <div className="flex flex-wrap mb-4">
            {sequence.split('').map((residue, index) => (
              <span
                key={index}
                style={{ backgroundColor: getResidueColor ? getResidueColor(index) : undefined }}
                className="w-[14px] h-[24px] text-center text-xs rounded-sm font-medium flex items-center justify-center"
              >
                {residue}
              </span>
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
          
        </div>
      </div>
    </div>
  );
} 