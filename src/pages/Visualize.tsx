import React, { useMemo } from 'react';
import FileUploader from '@/components/FileUploader';
import FileList from '@/components/FileList';
import { ViewControls } from '@/components/ViewControls';
import { NGLViewer } from '@/components/NGLViewer';
import { parsePDB, Molecule } from '@/utils/pdbParser';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useVisualizeStore } from '@/store/visualizeStore';
import { ViewMode, ColorScheme } from '@/types/viewer';
import { JobSelector } from '@/components/JobSelector';
import { Badge } from '@/components/ui/badge';
import { Distogram } from '@/components/Distogram';

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

export default function Visualize() {
  const {
    files,
    selectedFileIndex,
    loadedStructures,
    viewerState,
    addFiles,
    updateFile,
    setSelectedFileIndex,
    addLoadedStructures,
    setViewerState,
    deleteFile
  } = useVisualizeStore();

  // Calculate statistics for all loaded structures
  const structureStats = useMemo(() => {
    console.log('Calculating stats for all structures:', loadedStructures);
    return loadedStructures
      .filter(structure => structure.molecule)
      .map(structure => ({
        id: structure.id,
        name: structure.name,
        source: structure.source,
        stats: calculateMoleculeStats(structure.molecule!)
      }));
  }, [loadedStructures]);

  // Process files when uploaded
  const handleFilesUploaded = async (newFiles: File[]) => {
    console.log('Files uploaded:', newFiles);
    
    // Process each file first
    const processedFiles = await Promise.all(newFiles.map(async (file) => {
      try {
        console.log('Processing file:', file.name);
        const molecule = await parsePDB(file);
        console.log('Parsed molecule:', molecule);
        const pdbData = await file.text();
        return { file, molecule, pdbData };
      } catch (error) {
        console.error('Error processing file:', file.name, error);
        return { file, error };
      }
    }));

    // Filter out failed files
    const successfulFiles = processedFiles.filter(f => !f.error);
    const failedFiles = processedFiles.filter(f => f.error);

    if (failedFiles.length > 0) {
      console.error('Failed to process files:', failedFiles.map(f => f.file.name));
      // You might want to show an error message to the user here
    }

    if (successfulFiles.length === 0) {
      console.error('No files were processed successfully');
      return;
    }

    // Add files to state
    addFiles(successfulFiles.map(({ file, molecule }) => ({ file, molecule })));
    
    // Add structures for visualization
    addLoadedStructures(successfulFiles.map(({ file, molecule, pdbData }) => ({
      id: file.name,
      name: file.name,
      pdbData,
      source: 'file',
      molecule
    })));

    // Auto-select the first file if none selected
    if (selectedFileIndex === null) {
      console.log('Auto-selecting first file');
      setSelectedFileIndex(0);
    }
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewerState({ viewMode: mode });
  };

  const handleColorSchemeChange = (scheme: ColorScheme) => {
    setViewerState({ colorScheme: scheme });
  };

  const handleCenter = () => {
    // Center view logic will be handled by NGLViewer component
  };

  // Add debug logging for render
  console.log('Render state:', {
    filesCount: files.length,
    selectedFileIndex,
    hasMolecule: selectedFileIndex !== null ? !!files[selectedFileIndex]?.molecule : false,
    hasStats: !!structureStats
  });

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left sidebar */}
      <div className="col-span-3 space-y-6">
        <Card className="p-4">
          <FileUploader onFilesUploaded={handleFilesUploaded} />
        </Card>
        
        <Card className="p-4">
          <JobSelector />
        </Card>
        
        <Card className="p-4">
          <ViewControls
            viewerState={viewerState}
            molecules={files}
            selectedMoleculeIndex={selectedFileIndex}
            onViewModeChange={handleViewModeChange}
            onColorSchemeChange={handleColorSchemeChange}
            onFilesUploaded={handleFilesUploaded}
            onDeleteMolecule={deleteFile}
            onSelectMolecule={setSelectedFileIndex}
            onAtomSizeChange={(size) => setViewerState({ atomSize: size })}
            onLigandVisibilityChange={(visible) => setViewerState({ showLigand: visible })}
            onWaterIonVisibilityChange={(visible) => setViewerState({ showWaterIon: visible })}
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
            
        <Card className="p-5 flex-shrink-0">
          <Tabs defaultValue="stats" className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="info">Structure Info</TabsTrigger>
              <TabsTrigger value="stats">Statistics</TabsTrigger>
              <TabsTrigger value="distogram">Distogram</TabsTrigger>
            </TabsList>
            <TabsContent value="info" className="mt-4">
              <div className="grid gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium leading-none">
                    Loaded Structures
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Currently loaded structures and their sources
                  </p>
                </div>
                <Separator />
                <div className="space-y-4">
                  {loadedStructures.map((structure, index) => (
                    <div 
                      key={structure.id} 
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer ${index === selectedFileIndex ? 'bg-accent' : ''}`}
                      onClick={() => setSelectedFileIndex(index)}
                    >
                      <div>
                        <p className="font-medium">{structure.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Source: {structure.source === 'file' ? 'Uploaded File' : 'Job'}
                        </p>
                      </div>
                      {structure.molecule && (
                        <p className="text-sm text-muted-foreground">
                          {structure.molecule.atoms.length} atoms
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="stats" className="mt-4">
              {selectedFileIndex !== null && loadedStructures[selectedFileIndex]?.molecule ? (
                <div className="space-y-8">
                  {(() => {
                    const structure = loadedStructures[selectedFileIndex];
                    const stats = calculateMoleculeStats(structure.molecule!);
                    return (
                      <div key={structure.id} className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium">{structure.name}</h3>
                          <Badge variant={structure.source === 'file' ? "outline" : "secondary"}>
                            {structure.source === 'file' ? 'File' : 'Job'}
                          </Badge>
                        </div>
                        
                        {/* Atom Statistics */}
                        <div>
                          <h4 className="text-sm font-medium mb-2">Atom Statistics</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Total Atoms</p>
                              <p className="font-medium">{stats.totalAtoms}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Unique Elements</p>
                              <p className="font-medium">{stats.uniqueElements.join(', ')}</p>
                            </div>
                          </div>
                        </div>

                        <Separator />

                        {/* Chain Information */}
                        <div>
                          <h4 className="text-sm font-medium mb-2">Chain Information</h4>
                          <div className="grid grid-cols-4 gap-4 text-sm font-medium mb-2">
                            <div>Chain</div>
                            <div>Residues</div>
                            <div>Atoms</div>
                            <div>% of Total</div>
                          </div>
                          {stats.chainInfo.map(chain => (
                            <div key={chain.chainId} className="grid grid-cols-4 gap-4 text-sm">
                              <div>{chain.chainId}</div>
                              <div>{chain.residueCount}</div>
                              <div>{chain.atomCount}</div>
                              <div>
                                {((chain.atomCount / stats.totalAtoms) * 100).toFixed(1)}%
                              </div>
                            </div>
                          ))}
                        </div>

                        <Separator />

                        {/* Water and Ion Information */}
                        <div>
                          <h4 className="text-sm font-medium mb-2">Water and Ion Content</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Water Molecules</p>
                              <p className="font-medium">{stats.waterCount}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Ion Count</p>
                              <p className="font-medium">{stats.ionCount}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Select a structure to view its statistics
                </div>
              )}
            </TabsContent>
            <TabsContent value="distogram" className="mt-4">
              {selectedFileIndex !== null && loadedStructures[selectedFileIndex]?.molecule ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">{loadedStructures[selectedFileIndex].name} - Distogram</h3>
                  </div>
                  <Distogram molecule={loadedStructures[selectedFileIndex].molecule!} />
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Select a structure to view its distogram
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
} 