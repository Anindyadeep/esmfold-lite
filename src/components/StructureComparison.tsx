import React, { useState, useEffect } from 'react';
import { useVisualizeStore } from '@/store/visualizeStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calculateTMScore, parsePDB } from '@/utils/tmScore';
import { ArrowRight, BarChart2 } from 'lucide-react';

export default function StructureComparison() {
  const { 
    loadedStructures, 
    setCompareStructureIds, 
    setStructureComparison, 
    structureComparison 
  } = useVisualizeStore();
  
  const [structureA, setStructureA] = useState<string>('');
  const [structureB, setStructureB] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Reset selections if the number of loaded structures changes
  useEffect(() => {
    if (loadedStructures.length < 2) {
      setStructureA('');
      setStructureB('');
      setCompareStructureIds(null);
      setStructureComparison(null);
    }
  }, [loadedStructures.length, setCompareStructureIds, setStructureComparison]);

  const handleCompare = () => {
    if (!structureA || !structureB) {
      setError('Please select two structures to compare');
      return;
    }

    setError(null);
    setInfoMessage(null);
    setCompareStructureIds([structureA, structureB]);

    // Find the selected structures
    const structureAObj = loadedStructures.find(s => s.id === structureA);
    const structureBObj = loadedStructures.find(s => s.id === structureB);

    if (!structureAObj?.pdbData || !structureBObj?.pdbData) {
      setError('Selected structures don\'t have PDB data available');
      return;
    }

    try {
      // Parse PDB data to extract CA atom coordinates
      const coordsA = parsePDB(structureAObj.pdbData);
      const coordsB = parsePDB(structureBObj.pdbData);

      if (coordsA.length === 0 || coordsB.length === 0) {
        setError('Could not find CA atom coordinates in the PDB data');
        return;
      }

      // If coordinate lengths don't match, we'll use the shorter length
      // and notify the user
      if (coordsA.length !== coordsB.length) {
        const message = `Structures have different numbers of CA atoms (${coordsA.length} vs ${coordsB.length}). Using the first ${Math.min(coordsA.length, coordsB.length)} atoms for comparison.`;
        console.warn(message);
        setInfoMessage(message);
      }

      // Calculate TM score
      const tmScore = calculateTMScore(coordsA, coordsB);
      const usedCount = Math.min(coordsA.length, coordsB.length);
      
      console.log(`Calculated TM-score: ${tmScore} using ${usedCount} CA atoms`);
      
      // Save result
      setStructureComparison({
        structureA: structureA,
        structureB: structureB,
        tmScore,
        caAtomsCount: usedCount
      });
    } catch (err) {
      console.error('TM-score calculation error:', err);
      setError(err instanceof Error ? err.message : 'Error comparing structures');
    }
  };

  // Handle selection changes
  const handleStructureAChange = (value: string) => {
    setStructureA(value);
    if (value === structureB) {
      setStructureB('');
    }
  };

  const handleStructureBChange = (value: string) => {
    setStructureB(value);
    if (value === structureA) {
      setStructureA('');
    }
  };

  // Get names of structures for display
  const getStructureName = (id: string) => {
    return loadedStructures.find(s => s.id === id)?.name || 'Unknown';
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-medium">Structure Comparison</h3>
        <Badge variant="outline">TM-Score</Badge>
      </div>

      {loadedStructures.length < 2 ? (
        <div className="text-sm text-muted-foreground text-center py-2">
          Load at least two structures to compare
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-2 items-center mb-4">
            <div className="col-span-3">
              <Select value={structureA} onValueChange={handleStructureAChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select structure A" />
                </SelectTrigger>
                <SelectContent>
                  {loadedStructures.map(structure => (
                    <SelectItem key={structure.id} value={structure.id}>
                      {structure.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="col-span-1 flex justify-center">
              <ArrowRight className="text-muted-foreground" />
            </div>
            
            <div className="col-span-3">
              <Select value={structureB} onValueChange={handleStructureBChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select structure B" />
                </SelectTrigger>
                <SelectContent>
                  {loadedStructures
                    .filter(structure => structure.id !== structureA)
                    .map(structure => (
                      <SelectItem key={structure.id} value={structure.id}>
                        {structure.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            className="w-full mb-4" 
            onClick={handleCompare}
            disabled={!structureA || !structureB}
          >
            <BarChart2 className="mr-2 h-4 w-4" />
            Compare Structures
          </Button>

          {error && (
            <div className="text-sm bg-destructive/10 text-destructive p-3 rounded-md mb-4">
              <div className="font-medium mb-1">Error comparing structures:</div>
              <div>{error}</div>
              <div className="mt-2 text-xs">
                Common issues:
                <ul className="list-disc pl-4 mt-1">
                  <li>Structure files may not contain CA atoms</li>
                  <li>Structures may have different residue numbering</li>
                  <li>Try comparing structures with similar lengths</li>
                </ul>
              </div>
            </div>
          )}

          {infoMessage && !error && (
            <div className="text-sm bg-yellow-500/10 text-yellow-700 p-3 rounded-md mb-4">
              <div className="font-medium mb-1">Note:</div>
              <div>{infoMessage}</div>
            </div>
          )}

          {structureComparison && (
            <div className="bg-muted/30 p-3 rounded-md">
              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div>
                  <span className="text-muted-foreground">Structure A:</span>
                  <p className="font-medium truncate">{getStructureName(structureComparison.structureA)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Structure B:</span>
                  <p className="font-medium truncate">{getStructureName(structureComparison.structureB)}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-muted-foreground">TM-Score:</span>
                    <span className="text-sm font-medium">
                      {isNaN(structureComparison.tmScore) ? 
                        "Not available" : 
                        structureComparison.tmScore.toFixed(4)
                      }
                    </span>
                  </div>
                  
                  {/* Visual score gauge - only show if we have a valid score */}
                  {!isNaN(structureComparison.tmScore) && (
                    <>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            structureComparison.tmScore > 0.5 ? "bg-green-500" : 
                            structureComparison.tmScore > 0.3 ? "bg-blue-500" : 
                            "bg-yellow-500"
                          }`}
                          style={{ width: `${Math.min(100, structureComparison.tmScore * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>0.0</span>
                        <span>0.5</span>
                        <span>1.0</span>
                      </div>
                      
                      <div className="text-xs text-muted-foreground mt-2">
                        {structureComparison.tmScore > 0.5 ? (
                          "Structures are in the same fold (TM-score > 0.5)"
                        ) : structureComparison.tmScore > 0.3 ? (
                          "Structures have some similarity (0.3 < TM-score < 0.5)"
                        ) : (
                          "Structures are not similar (TM-score < 0.3)"
                        )}
                      </div>
                    </>
                  )}
                  
                  {/* Show message if score is NaN */}
                  {isNaN(structureComparison.tmScore) && (
                    <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
                      Could not calculate a valid TM-score for these structures. This may be due to:
                      <ul className="list-disc pl-4 mt-1">
                        <li>Incompatible structure formats</li>
                        <li>Significant differences in structure size or alignment</li>
                        <li>Missing coordinate data</li>
                      </ul>
                    </div>
                  )}
                </div>

                <div className="pt-1">
                  <span className="text-muted-foreground text-sm">CA Atoms Compared:</span>
                  <p className="font-medium">{structureComparison.caAtomsCount}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
} 