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

  // Calculate statistics for the selected molecule
  const selectedMoleculeStats = useMemo(() => {
    console.log('Calculating stats:', { selectedFileIndex, files });
    if (selectedFileIndex !== null && files[selectedFileIndex]?.molecule) {
      const stats = calculateMoleculeStats(files[selectedFileIndex].molecule!);
      console.log('Calculated stats:', stats);
      return stats;
    }
    console.log('No molecule data available for stats');
    return null;
  }, [selectedFileIndex, files]);

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
    addLoadedStructures(successfulFiles.map(({ file, pdbData }) => ({
      id: file.name,
      pdbData
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
    hasStats: !!selectedMoleculeStats
  });

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left sidebar */}
      <div className="col-span-3 space-y-6">
        <Card className="p-4">
          <FileUploader onFilesUploaded={handleFilesUploaded} />
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
          {selectedFileIndex !== null && files[selectedFileIndex]?.molecule ? (
            <Tabs defaultValue="stats" className="w-full">
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
                {selectedMoleculeStats ? (
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

                    {/* Description */}
                    <div>
                      <h3 className="text-sm font-medium mb-2">Structure Description</h3>
                      <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-blue-500">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M12 2v1m0 18v1M4.93 4.93l.7.7m12.74 12.74l.7.7M2 12h1m18 0h1M4.93 19.07l.7-.7m12.74-12.74l.7-.7" />
                                </svg>
                              </span>
                              <p className="font-medium">Water Molecules</p>
                            </div>
                            <p className="text-muted-foreground">{selectedMoleculeStats.waterCount} molecules</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-purple-500">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10" />
                                  <circle cx="12" cy="12" r="4" />
                                </svg>
                              </span>
                              <p className="font-medium">Ions</p>
                            </div>
                            <p className="text-muted-foreground">{selectedMoleculeStats.ionCount} ions</p>
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-emerald-500">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 3v18h18" />
                                <path d="M7 17v-4" />
                                <path d="M11 17v-8" />
                                <path d="M15 17v-6" />
                                <path d="M19 17v-10" />
                              </svg>
                            </span>
                            <p className="font-medium">Composition Summary</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-muted-foreground">
                              Structure contains {selectedMoleculeStats.chainInfo.length} chain{selectedMoleculeStats.chainInfo.length > 1 ? 's' : ''} with a total of {selectedMoleculeStats.totalAtoms} atoms.
                            </p>
                            <p className="text-muted-foreground">
                              Elements present: {selectedMoleculeStats.uniqueElements.join(', ')}
                            </p>
                            <p className="text-muted-foreground">
                              {Object.keys(selectedMoleculeStats.residueCounts).length} unique residue types identified.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <h3 className="text-xl font-semibold mb-2">No Statistics Available</h3>
                    <p>Please make sure a PDB file is selected and properly loaded</p>
                    <p className="text-sm mt-2">If you're seeing this message with a file selected, there might be an error processing the file.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <h3 className="text-xl font-semibold mb-2">No Structure Selected</h3>
              <p>Upload and select a PDB file to view statistics</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
} 