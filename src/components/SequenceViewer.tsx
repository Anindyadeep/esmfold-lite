import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Minimize, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ResidueInfo {
  id: number;
  code: string;
  name?: string;
  chain?: string;
}

interface SequenceViewerProps {
  sequence: string;
  residueData?: ResidueInfo[];
  onResidueClick?: (index: number) => void;
  onResidueHover?: (index: number | null) => void;
}

const aminoAcidGroups = {
  hydrophobic: ['A', 'V', 'I', 'L', 'M', 'F', 'W', 'Y'],
  polar: ['S', 'T', 'N', 'Q', 'C'],
  acidic: ['D', 'E'],
  basic: ['K', 'R', 'H'],
  special: ['G', 'P']
};

export function SequenceViewer({ 
  sequence, 
  residueData,
  onResidueClick, 
  onResidueHover 
}: SequenceViewerProps) {

  const [isCollapsed, setIsCollapsed] = useState(false);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  const cleanedSequence = sequence.replace(/\s+/g, '');

  const getResidueColor = (code: string): string => {
    if (aminoAcidGroups.hydrophobic.includes(code)) return '#ff8f8f';
    if (aminoAcidGroups.polar.includes(code)) return '#8fce8f';
    if (aminoAcidGroups.acidic.includes(code)) return '#ff725c';
    if (aminoAcidGroups.basic.includes(code)) return '#80b1d3';
    if (aminoAcidGroups.special.includes(code)) return '#fdb462';
    return '#cccccc';
  };

  const getResidueTooltip = (residue: string, index: number): string => {
    if (residueData && residueData[index]) {
      const info = residueData[index];
      let tooltip = info.name ? `${info.name} (${info.code})` : info.code;
      tooltip += ` ${info.id}`;
      if (info.chain) tooltip += ` Chain ${info.chain}`;
      return tooltip;
    }
    return `${residue}${index + 1}`;
  };

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

  const formatSequenceTable = () => {
    const segments = [];
    const segmentSize = 10;
    const columns = 4; // Fixed number of columns
    
    for (let i = 0; i < cleanedSequence.length; i += segmentSize) {
      segments.push(cleanedSequence.substring(i, Math.min(i + segmentSize, cleanedSequence.length)));
    }

    const rows = [];
    for (let i = 0; i < segments.length; i += columns) {
      const rowSegments = segments.slice(i, i + columns);
      rows.push(rowSegments);
    }

    return (
      <div className="w-full overflow-x-auto overflow-y-auto max-h-[30vh]">
        <table className="w-max">
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-muted last:border-b-0">
                {row.map((segment, segmentIndex) => {
                  const startIndex = (rowIndex * columns + segmentIndex) * segmentSize;
                  return (
                    <td key={segmentIndex} className="p-[0.5rem] align-top">
                      <div className="flex flex-col min-w-[120px]">
                        <div className="text-xs text-muted-foreground mb-1 text-end">
                          {startIndex + segment.length}
                        </div>
                        <div className="flex flex-wrap gap-[0.1rem]">
                          {segment.split('').map((residue, idx) => {
                            const globalIndex = startIndex + idx;
                            const code = residueData?.[globalIndex]?.code || residue;
                            return (
                              <span
                                key={idx}
                                style={{ backgroundColor: getResidueColor(code) }}
                                className="w-[14px] h-[24px] text-center text-xs rounded-sm font-medium flex items-center justify-center"
                                onClick={() => onResidueClick?.(globalIndex)}
                                onMouseEnter={() => onResidueHover?.(globalIndex)}
                                onMouseLeave={() => onResidueHover?.(null)}
                                title={getResidueTooltip(residue, globalIndex)}
                              >
                                {residue}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </td>
                  );
                })}
                {/* Fill empty cells if last row has fewer segments */}
                {row.length < columns && 
                  Array(columns - row.length).fill(0).map((_, i) => (
                    <td key={`empty-${i}`} className="p-1"></td>
                  ))
                }
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="w-full rounded-md bg-muted/30 p-3 relative">
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

      <div className="font-mono text-sm">
        {formatSequenceTable()}

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
      </div>
    </div>
  );
}