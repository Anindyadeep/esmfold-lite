import React, { useEffect, useState } from 'react';
import { useVisualizeStore } from '@/store/visualizeStore';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { X } from 'lucide-react';
import { StructureDetails } from './StructureDetails';
import { Distogram } from './Distogram';
import { calculateDistogram } from '@/utils/distogram';

export function LoadedStructures() {
  const { loadedStructures, removeStructureById } = useVisualizeStore();
  const [calculatedDistograms, setCalculatedDistograms] = useState<Record<string, number[][]>>({});

  // Calculate distograms for uploaded structures
  useEffect(() => {
    loadedStructures.forEach(structure => {
      if (structure.source === 'file' && structure.molecule && !calculatedDistograms[structure.id]) {
        const distogram = calculateDistogram(structure.molecule);
        setCalculatedDistograms(prev => ({
          ...prev,
          [structure.id]: distogram
        }));
      }
    });
  }, [loadedStructures]);

  if (loadedStructures.length === 0) {
    return (
      <Card className="p-4 text-center text-muted-foreground">
        <p>No structures loaded. Upload files or select jobs to visualize.</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <ScrollArea className="h-[calc(100vh-24rem)]">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold mb-4">Loaded Structures</h3>
          {loadedStructures.map((structure) => (
            <Card key={structure.id} className="p-4 relative">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="text-base font-medium">{structure.name}</h4>
                  <div className="flex gap-2 mt-1">
                    <Badge variant={structure.source === 'job' ? 'default' : 'secondary'}>
                      {structure.source === 'job' ? 'Job' : 'Uploaded'}
                    </Badge>
                    {structure.molecule && (
                      <>
                        <Badge variant="outline">
                          {structure.molecule.atoms.length} atoms
                        </Badge>
                        <Badge variant="outline">
                          {new Set(structure.molecule.atoms.map(a => a.residueId)).size} residues
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeStructureById(structure.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <Tabs defaultValue="info" className="mt-4">
                <TabsList>
                  <TabsTrigger value="info">Info</TabsTrigger>
                  <TabsTrigger value="stats">Statistics</TabsTrigger>
                  {(structure.metadata?.distogram || calculatedDistograms[structure.id]) && (
                    <TabsTrigger value="distogram">Distogram</TabsTrigger>
                  )}
                </TabsList>
                
                {/* Basic Info Tab */}
                <TabsContent value="info" className="text-sm space-y-2">
                  {structure.source === 'job' && structure.metadata && (
                    <>
                      <p>Created: {new Date(structure.metadata.created_at!).toLocaleString()}</p>
                      <p>Completed: {new Date(structure.metadata.completed_at!).toLocaleString()}</p>
                      {structure.metadata.error_message && (
                        <p className="text-destructive">Error: {structure.metadata.error_message}</p>
                      )}
                    </>
                  )}
                  {structure.source === 'file' && structure.metadata && (
                    <p>Uploaded: {new Date(structure.metadata.created_at!).toLocaleString()}</p>
                  )}
                </TabsContent>

                {/* Statistics Tab */}
                <TabsContent value="stats">
                  {structure.molecule && (
                    <StructureDetails 
                      molecule={structure.molecule}
                    />
                  )}
                </TabsContent>

                {/* Distogram Tab */}
                {(structure.metadata?.distogram || calculatedDistograms[structure.id]) && (
                  <TabsContent value="distogram">
                    <Card className="p-4">
                      <h4 className="text-sm font-medium mb-4">Distance Matrix</h4>
                      <div className="h-[400px]">
                        <Distogram 
                          molecule={structure.molecule}
                          data={structure.metadata?.distogram || calculatedDistograms[structure.id]}
                          width={400} 
                          height={400}
                        />
                      </div>
                    </Card>
                  </TabsContent>
                )}
              </Tabs>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
} 