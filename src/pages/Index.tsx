import React, { useState, useEffect, useMemo } from 'react';
import FileUploader from '@/components/FileUploader';
import FileList from '@/components/FileList';
import { ViewControls } from '@/components/ViewControls';
import { NGLViewer } from '@/components/NGLViewer';
import { parsePDB, Molecule } from '@/utils/pdbParser';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ViewMode, ColorScheme } from '@/types/viewer';

interface MoleculeStats {
  totalAtoms: number;
  uniqueElements: string[];
  residueCounts: { [key: string]: number };
  chainInfo: {
    chainId: string;
    residueCount: number;
    atomCount: number;
  }[];
  waterCount: number;
  ionCount: number;
}

const calculateMoleculeStats = (molecule: Molecule): MoleculeStats => {
  const stats: MoleculeStats = {
    totalAtoms: molecule.atoms.length,
    uniqueElements: [],
    residueCounts: {},
    chainInfo: [],
    waterCount: 0,
    ionCount: 0
  };

  // Temporary sets and maps for calculations
  const elements = new Set<string>();
  const chainMap = new Map<string, { residues: Set<number>, atoms: number }>();

  // Process each atom
  molecule.atoms.forEach(atom => {
    // Count unique elements
    elements.add(atom.element);

    // Count residues
    if (!stats.residueCounts[atom.residue]) {
      stats.residueCounts[atom.residue] = 0;
    }
    stats.residueCounts[atom.residue]++;

    // Process chain information
    if (!chainMap.has(atom.chain)) {
      chainMap.set(atom.chain, { residues: new Set(), atoms: 0 });
    }
    const chainInfo = chainMap.get(atom.chain)!;
    chainInfo.residues.add(atom.residueId);
    chainInfo.atoms++;

    // Count water and ions
    if (atom.residue === 'HOH' || atom.residue === 'WAT') {
      stats.waterCount++;
    } else if (atom.residue.length <= 2 && !atom.residue.match(/[a-z]/i)) {
      stats.ionCount++;
    }
  });

  // Convert chain map to array
  stats.chainInfo = Array.from(chainMap.entries()).map(([chainId, info]) => ({
    chainId,
    residueCount: info.residues.size,
    atomCount: info.atoms
  }));

  // Sort chains by ID
  stats.chainInfo.sort((a, b) => a.chainId.localeCompare(b.chainId));

  // Convert elements set to sorted array
  stats.uniqueElements = Array.from(elements).sort();

  return stats;
};

const Index = () => {
  // State for files and structures
  const [files, setFiles] = useState<{ file: File; molecule?: Molecule }[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null);
  const [loadedStructures, setLoadedStructures] = useState<{ id: string; pdbData: string }[]>([]);
  
  // Viewer state
  const [viewerState, setViewerState] = useState({
    viewMode: 'cartoon' as ViewMode,
    colorScheme: 'DEFAULT' as ColorScheme
  });

  // Calculate statistics for the selected molecule
  const selectedMoleculeStats = useMemo(() => {
    if (selectedFileIndex !== null && files[selectedFileIndex]?.molecule) {
      return calculateMoleculeStats(files[selectedFileIndex].molecule!);
    }
    return null;
  }, [selectedFileIndex, files]);

  // Process files when uploaded
  const handleFilesUploaded = async (newFiles: File[]) => {
    // Add files to state immediately
    setFiles(prev => [...prev, ...newFiles.map(file => ({ file }))]);
    
    // Process each file
    for (const file of newFiles) {
      try {
        // Parse molecule data
        const molecule = await parsePDB(file);
        setFiles(prev => {
          const index = prev.findIndex(f => f.file === file);
          if (index === -1) return prev;
          const newFiles = [...prev];
          newFiles[index] = { file, molecule };
          return newFiles;
        });

        // Load PDB data for visualization
        const pdbData = await file.text();
        setLoadedStructures(prev => [...prev, { id: file.name, pdbData }]);
        
        // Auto-select the first file if none selected
        setSelectedFileIndex(prev => prev === null ? 0 : prev);
      } catch (error) {
        console.error('Error processing PDB file:', error);
      }
    }
  };
  
  const handleDeleteFile = (index: number) => {
    // Remove from files state
    setFiles(prev => {
      const newFiles = [...prev];
      newFiles.splice(index, 1);
      return newFiles;
    });
    
    // Remove from loaded structures
    setLoadedStructures(prev => {
      const newStructures = [...prev];
      newStructures.splice(index, 1);
      return newStructures;
    });
    
    // Update selected file index
    if (selectedFileIndex === index) {
      setSelectedFileIndex(files.length > 1 ? 0 : null);
    } else if (selectedFileIndex !== null && selectedFileIndex > index) {
      setSelectedFileIndex(selectedFileIndex - 1);
    }
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewerState(prev => ({ ...prev, viewMode: mode }));
  };

  const handleColorSchemeChange = (scheme: ColorScheme) => {
    setViewerState(prev => ({ ...prev, colorScheme: scheme }));
  };

  const handleCenter = () => {
    // Center view logic will be handled by NGLViewer component
  };

  return (
    <div className="container mx-auto p-6 min-h-screen">
      <div className="grid grid-cols-12 gap-6">
        {/* Left sidebar */}
        <div className="col-span-3 space-y-6">
          <Card className="p-4">
            <FileUploader onFilesUploaded={handleFilesUploaded} />
          </Card>
          
          <Card>
            <ViewControls
              viewerState={viewerState}
              onViewModeChange={handleViewModeChange}
              onColorSchemeChange={handleColorSchemeChange}
              onCenter={handleCenter}
            />
          </Card>

          <Card className="p-4">
            <FileList
              files={files}
              selectedIndex={selectedFileIndex}
              onSelect={setSelectedFileIndex}
              onDelete={handleDeleteFile}
            />
          </Card>
        </div>
          
        <div className="col-span-9 flex flex-col gap-6">
          <Card className="flex-1 p-0 overflow-hidden rounded-lg border bg-card shadow-sm min-h-[600px] relative">
            <NGLViewer 
              structures={loadedStructures}
              viewerState={viewerState}
            />
          </Card>
            
          {selectedFileIndex !== null && files[selectedFileIndex]?.molecule && (
            <Card className="p-5 flex-shrink-0">
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="info">Molecule Info</TabsTrigger>
                  <TabsTrigger value="stats">Statistics</TabsTrigger>
                </TabsList>
                <TabsContent value="info" className="mt-4">
                  <div className="grid gap-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium leading-none">
                        {files[selectedFileIndex].file.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Structure details and information
                      </p>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">File Name</p>
                        <p className="text-sm font-medium">{files[selectedFileIndex].file.name}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Atom Count</p>
                        <p className="text-sm font-medium">{files[selectedFileIndex].molecule?.atoms.length}</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="stats" className="mt-4">
                  {selectedMoleculeStats && (
                    <div className="space-y-6">
                      {/* Atom Statistics */}
                      <div>
                        <h3 className="text-sm font-medium mb-2">Atom Statistics</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Total Atoms</p>
                            <p className="font-medium">{selectedMoleculeStats.totalAtoms}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Unique Elements</p>
                            <p className="font-medium">{selectedMoleculeStats.uniqueElements.join(', ')}</p>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Chain Information */}
                      <div>
                        <h3 className="text-sm font-medium mb-2">Chain Information</h3>
                        <div className="grid grid-cols-4 gap-4 text-sm font-medium mb-2">
                          <div>Chain</div>
                          <div>Residues</div>
                          <div>Atoms</div>
                          <div>% of Total</div>
                        </div>
                        {selectedMoleculeStats.chainInfo.map(chain => (
                          <div key={chain.chainId} className="grid grid-cols-4 gap-4 text-sm">
                            <div>{chain.chainId}</div>
                            <div>{chain.residueCount}</div>
                            <div>{chain.atomCount}</div>
                            <div>
                              {((chain.atomCount / selectedMoleculeStats.totalAtoms) * 100).toFixed(1)}%
                            </div>
                          </div>
                        ))}
                      </div>

                      <Separator />

                      {/* Residue Statistics */}
                      <div>
                        <h3 className="text-sm font-medium mb-2">Residue Statistics</h3>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          {Object.entries(selectedMoleculeStats.residueCounts)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([residue, count]) => (
                              <div key={residue}>
                                <span className="font-medium">{residue}</span>: {count}
                              </div>
                            ))}
                        </div>
                      </div>

                      <Separator />

                      {/* Water and Ion Statistics */}
                      <div>
                        <h3 className="text-sm font-medium mb-2">Water and Ions</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Water Molecules</p>
                            <p className="font-medium">{selectedMoleculeStats.waterCount}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Ions</p>
                            <p className="font-medium">{selectedMoleculeStats.ionCount}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
