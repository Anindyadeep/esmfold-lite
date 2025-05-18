import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Minimize, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

  // Add state for collapsed/expanded view
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Toggle collapse state
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
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

  // Clean the sequence - remove any whitespace if present
  const cleanedSequence = sequence.replace(/\s+/g, '');

  // If collapsed, show a minimal view
  if (isCollapsed) {
    return (
      <div className="w-full rounded-md bg-muted/30 p-3 relative">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Sequence ({cleanedSequence.length} residues)</span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-muted-foreground"
            onClick={toggleCollapse}
            title="Expand"
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Format sequence in 10-residue blocks for display
  const formatSequenceBlocks = () => {
    const blocks = [];
    
    // Process the sequence in 10-residue chunks
    for (let i = 0; i < cleanedSequence.length; i += 10) {
      const lineNumber = i + 10;
      const segment = cleanedSequence.substring(i, Math.min(i + 10, cleanedSequence.length));
      
      blocks.push(
        <div key={i} className="flex items-center my-1">
          <span className="text-xs text-muted-foreground w-8 text-right mr-2">
            {lineNumber < 100 ? (lineNumber < 10 ? '  ' : ' ') : ''}{lineNumber}
          </span>
          <div className="flex">
            {segment.split('').map((residue, idx) => (
              <span
                key={idx}
                style={{ backgroundColor: getResidueColor ? getResidueColor(i + idx) : undefined }}
                className="w-[14px] h-[24px] text-center text-xs rounded-sm font-medium flex items-center justify-center"
                onClick={() => onResidueClick && onResidueClick(i + idx)}
                title={getResidueTooltip(residue, i + idx)}
              >
                {residue}
              </span>
            ))}
          </div>
        </div>
      );
    }
    return blocks;
  };

  return (
    <div className="w-full overflow-x-auto rounded-md bg-muted/30 p-3 relative">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium">Sequence ({cleanedSequence.length} residues)</span>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 text-muted-foreground"
          onClick={toggleCollapse}
          title="Collapse"
        >
          <Minimize className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex flex-wrap font-mono text-sm">
        {/* Sequence with 10-residue blocks */}
        <div className="flex flex-col w-full">
          {formatSequenceBlocks()}
          
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