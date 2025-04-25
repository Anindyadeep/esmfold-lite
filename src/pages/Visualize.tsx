import React, { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import FileUploader from '@/components/FileUploader';
import FileList from '@/components/FileList';
import { ViewControls } from '@/components/ViewControls';
import { MolStarViewer } from '@/components';
import { VisualizationWrapper } from '@/components/VisualizationWrapper';
import { parsePDB, Molecule } from '@/utils/pdbParser';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useVisualizeStore } from '@/store/visualizeStore';
import { ViewMode, ColorScheme } from '@/types/viewer';
import { JobSelector } from '@/components/JobSelector';
import { Badge } from '@/components/ui/badge';
import { Distogram } from '@/components/Distogram';
import { Input } from '@/components/ui/input';
import ErrorBoundary from '@/components/ErrorBoundary';
import { SequenceViewer, ResidueInfo } from '@/components/SequenceViewer';
import { Maximize, Minimize } from 'lucide-react';

// Amino acid property grouping for color coding
const aminoAcidGroups = {
  hydrophobic: ['A', 'I', 'L', 'M', 'F', 'W', 'V', 'P'],
  polar: ['N', 'C', 'Q', 'S', 'T', 'Y'],
  acidic: ['D', 'E'],
  basic: ['R', 'H', 'K'],
  special: ['G'],
  other: ['X', 'B', 'Z', 'U', 'O']
};

// Color mapping for amino acid groups
const getResidueColor = (code: string): string => {
  if (aminoAcidGroups.hydrophobic.includes(code)) return '#ff8f8f'; // Red-ish
  if (aminoAcidGroups.polar.includes(code)) return '#8fce8f'; // Green-ish  
  if (aminoAcidGroups.acidic.includes(code)) return '#ff725c'; // Bright red
  if (aminoAcidGroups.basic.includes(code)) return '#80b1d3'; // Blue-ish
  if (aminoAcidGroups.special.includes(code)) return '#fdb462'; // Orange
  return '#cccccc'; // Gray for other/unknown
};

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

function VisualizeContent() {
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
    deleteFile,
    getSelectedStructure
  } = useVisualizeStore();
  
  // Reference for the plot container
  const plotRef = useRef<HTMLDivElement>(null);
  const molstarRef = useRef<any>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // Function to reset the camera when needed
  const resetCamera = () => {
    if (molstarRef.current && molstarRef.current.resetView) {
      molstarRef.current.resetView();
    }
  };

  // Get the currently selected structure
  const selectedStructure = getSelectedStructure();

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

  // Add useCallback for deleteFile to add logging
  const handleDeleteFile = useCallback((index: number) => {
    console.log(`Visualize: About to delete file at index ${index}`);
    console.log('Current loadedStructures before deletion:', loadedStructures);
    deleteFile(index);
  }, [deleteFile, loadedStructures]);

  // Add an effect to log structure details for debugging
  useEffect(() => {
    console.log('loadedStructures changed. Current count:', loadedStructures.length);
    if (loadedStructures.length > 0) {
      console.log('Currently loaded structures:', loadedStructures.map(s => ({
        id: s.id,
        name: s.name,
        source: s.source,
        hasAtoms: s.molecule ? s.molecule.atoms.length : 0
      })));

      // Reset camera and refresh viewer when structures change
      if (molstarRef.current) {
        setTimeout(() => {
          resetCamera();
          // Force a resize event to ensure proper rendering
          window.dispatchEvent(new Event('resize'));
        }, 100);
      }
    } else {
      console.log('No structures loaded');
    }
  }, [loadedStructures]);

  // Process files when uploaded
  const handleFilesUploaded = async (newFiles: File[]) => {
    console.log('Files uploaded:', newFiles);
    
    // Process each file first
    const processedFiles = await Promise.all(newFiles.map(async (file) => {
      try {
        console.log('Processing file:', file.name);
        const fileData = await file.text();
        
        // For CIF files, we don't need to parse them as they'll be handled directly by NGL
        const isCifFile = file.name.toLowerCase().endsWith('.cif');
        const molecule = isCifFile ? null : await parsePDB(file);
        
        if (isCifFile) {
          console.log('CIF file detected, skipping PDB parsing');
        } else {
          console.log('Parsed molecule:', molecule);
        }
        
        return { file, molecule, pdbData: fileData };
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
      id: `file-${file.name}-${Date.now()}`, // Ensure unique IDs
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
    console.log(`Switching view mode: ${mode} (will use ${mode === 'default' && viewerState.colorScheme === 'DEFAULT' ? 'MolStar' : 'NGL'} renderer)`);
    setViewerState({ viewMode: mode });
  };

  const handleColorSchemeChange = (scheme: ColorScheme) => {
    console.log(`Switching color scheme: ${scheme} (will use ${viewerState.viewMode === 'default' && scheme === 'DEFAULT' ? 'MolStar' : 'NGL'} renderer)`);
    setViewerState({ colorScheme: scheme });
  };

  const handleCenter = () => {
    // Center view logic will be handled by NGLViewer component
  };

  // Add a safe structure selection handler
  const handleStructureSelect = (index: number) => {
    if (index >= 0 && index < loadedStructures.length) {
      console.log(`Selecting structure at index ${index}:`, loadedStructures[index].id);
      setSelectedFileIndex(index);
      
      // Force viewer update when selecting a structure
      setTimeout(() => {
        resetCamera();
        window.dispatchEvent(new Event('resize'));
      }, 100);
    }
  };

  // Handle full screen toggle
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      // Enter full screen
      if (canvasContainerRef.current?.requestFullscreen) {
        canvasContainerRef.current.requestFullscreen()
          .then(() => setIsFullScreen(true))
          .catch(err => console.error('Error attempting to enable full-screen mode:', err));
      }
    } else {
      // Exit full screen
      if (document.exitFullscreen) {
        document.exitFullscreen()
          .then(() => setIsFullScreen(false))
          .catch(err => console.error('Error attempting to exit full-screen mode:', err));
      }
    }
  };

  // Listen for fullscreen change events
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
      // Trigger resize to ensure proper rendering
      window.dispatchEvent(new Event('resize'));
      // Reset camera when toggling fullscreen
      if (molstarRef.current) {
        setTimeout(() => {
          resetCamera();
        }, 100);
      }
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

  // Add debug logging for render
  console.log('Render state:', {
    filesCount: files.length,
    loadedStructures: loadedStructures.length,
    selectedFileIndex,
    selectedStructure: selectedStructure?.id || 'none'
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
            onDeleteMolecule={handleDeleteFile}
            onSelectMolecule={setSelectedFileIndex}
            onAtomSizeChange={(size) => setViewerState({ atomSize: size })}
            onLigandVisibilityChange={(visible) => setViewerState({ showLigand: visible })}
            onWaterIonVisibilityChange={(visible) => setViewerState({ showWaterIon: visible })}
          />
        </Card>
      </div>
        
      <div className="col-span-9 flex flex-col gap-4">
        {/* Sequence Viewer placed above the 3D Viewer */}
        {selectedStructure?.molecule && (
          <Card className="p-4 bg-card">
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-sm font-medium">Sequence</h5>
              <Badge variant={selectedStructure.source === 'file' ? "outline" : "secondary"}>
                {selectedStructure.name || 'Structure'}
              </Badge>
            </div>
            {(() => {
              // Extract sequence information
              const residuesById = selectedStructure.molecule.atoms
                .filter(atom => atom.residue !== 'HOH' && atom.residue !== 'WAT')
                .reduce((acc, atom) => {
                  if (!acc[atom.residueId]) {
                    acc[atom.residueId] = {
                      id: atom.residueId,
                      name: atom.residue,
                      chain: atom.chain
                    };
                  }
                  return acc;
                }, {} as Record<number, { id: number, name: string, chain: string }>);
              
              // Sort residues by ID to maintain proper sequence order
              const sortedResidueIds = Object.keys(residuesById)
                .map(Number)
                .sort((a, b) => a - b);
              
              // Convert 3-letter amino acid codes to 1-letter codes for display
              const aminoAcidMap: Record<string, string> = {
                'ALA': 'A', 'ARG': 'R', 'ASN': 'N', 'ASP': 'D',
                'CYS': 'C', 'GLN': 'Q', 'GLU': 'E', 'GLY': 'G',
                'HIS': 'H', 'ILE': 'I', 'LEU': 'L', 'LYS': 'K',
                'MET': 'M', 'PHE': 'F', 'PRO': 'P', 'SER': 'S',
                'THR': 'T', 'TRP': 'W', 'TYR': 'Y', 'VAL': 'V',
                // Non-standard amino acids
                'MSE': 'M', 'HSE': 'H', 'HSD': 'H', 'HSP': 'H',
                'SEC': 'U', 'PYL': 'O', 'ASX': 'B', 'GLX': 'Z',
                'UNK': 'X'
              };
              
              // Build the residue info array
              const residueInfo: ResidueInfo[] = [];
              sortedResidueIds.forEach(resId => {
                const residue = residuesById[resId];
                const code = aminoAcidMap[residue.name] || 'X'; // Default to X for unknown
                residueInfo.push({ 
                  id: resId, 
                  code,
                  name: residue.name,
                  chain: residue.chain
                });
              });
              
              const sequenceString = residueInfo.map(res => res.code).join('');
              
              return (
                <SequenceViewer 
                  sequence={sequenceString}
                  residueData={residueInfo}
                  getResidueColor={(index) => getResidueColor(residueInfo[index]?.code || 'X')}
                  onResidueClick={(index) => {
                    const residueId = residueInfo[index]?.id;
                    if (residueId !== undefined) {
                      // Update viewer state to display the clicked residue in licorice representation
                      setViewerState({
                        ...viewerState,
                        selectedResidues: [residueId],
                        viewMode: 'licorice' // Switch to licorice view when clicking a residue
                      });
                    }
                  }}
                  onResidueHover={(index) => {
                    if (index === null) {
                      // Clear selection when not hovering
                      setViewerState({
                        ...viewerState,
                        selectedResidues: []
                      });
                    } else {
                      // Get the actual residue ID from our mapping
                      const residueId = residueInfo[index]?.id;
                      if (residueId !== undefined) {
                        // Update viewer state to highlight the hovered residue
                        setViewerState({
                          ...viewerState,
                          selectedResidues: [residueId]
                        });
                      }
                    }
                  }}
                />
              );
            })()}
          </Card>
        )}
        
        {/* Main visualization area with 3D Viewer and Statistics side by side */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left side with Canvas/Distogram tabs */}
          <div className="col-span-8">
            <Card className="overflow-hidden">
              <Tabs defaultValue="canvas" className="h-full" onValueChange={(value) => {
                // When switching back to canvas, trigger a resize event and reset camera
                if (value === 'canvas') {
                  setTimeout(() => {
                    window.dispatchEvent(new Event('resize'));
                    resetCamera();
                  }, 50);
                }
              }}>
                <div className="flex items-center justify-between p-3 border-b">
                  <TabsList>
                    <TabsTrigger value="canvas">Canvas</TabsTrigger>
                    <TabsTrigger value="distogram">Distance Matrix</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="canvas" className="m-0">
                  <div className="aspect-square relative" ref={canvasContainerRef}>
                    <button 
                      onClick={toggleFullScreen}
                      className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-background/80 hover:bg-background shadow-md transition-colors"
                      title={isFullScreen ? "Exit Full Screen" : "Enter Full Screen"}
                      aria-label={isFullScreen ? "Exit Full Screen" : "Enter Full Screen"}
                    >
                      {isFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
                    </button>
                    <VisualizationWrapper 
                      ref={molstarRef}
                      structures={loadedStructures}
                      viewerState={viewerState}
                      key={`viewer-${loadedStructures.map(s => s.id).join('-')}`}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="distogram" className="m-0">
                  <div className="aspect-square p-4">
                    {selectedStructure?.molecule ? (
                      <div className="h-full w-full relative" ref={plotRef}>
                        <Distogram 
                          molecule={selectedStructure.molecule!} 
                          data={selectedStructure.metadata?.distogram}
                          width={plotRef?.current?.offsetWidth || 500}
                          height={plotRef?.current?.offsetHeight || 500}
                        />
                      </div>
                    ) : (
                      <div className="text-center py-6 text-sm text-muted-foreground h-full flex items-center justify-center">
                        Select a structure to view its distance matrix
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
          
          {/* Statistics Card - Right side */}
          <div className="col-span-4">
            <Card className="p-4 overflow-auto h-full max-h-[600px] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h5 className="text-sm font-semibold">Structure Statistics</h5>
                {selectedStructure?.molecule && (
                  <Badge variant={selectedStructure.source === 'file' ? "outline" : "secondary"} className="ml-2">
                    {selectedStructure.source === 'file' ? 'File' : 'Job'}
                  </Badge>
                )}
              </div>
              
              {selectedStructure?.molecule ? (
                <div className="space-y-4">
                  {(() => {
                    const stats = calculateMoleculeStats(selectedStructure.molecule!);
                    
                    return (
                      <div key={selectedStructure.id}>
                        <div className="flex items-center mb-3">
                          <h4 className="text-sm font-medium">{selectedStructure.name}</h4>
                        </div>

                        <Separator className="my-3" />
                        
                        {/* Atom Statistics */}
                        <div className="mb-3">
                          <h5 className="text-sm font-medium mb-2">Atom Statistics</h5>
                          <div className="grid grid-cols-2 gap-3 text-sm bg-muted/30 p-3 rounded-md">
                            <div className="space-y-1">
                              <p className="text-muted-foreground">Total Atoms</p>
                              <p className="font-medium text-lg">{stats.totalAtoms}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-muted-foreground">Unique Elements</p>
                              <p className="font-medium">{stats.uniqueElements.join(', ')}</p>
                            </div>
                          </div>
                        </div>

                        <Separator className="my-3" />

                        {/* Chain Information */}
                        <div className="mb-3">
                          <h5 className="text-sm font-medium mb-2">Chain Information</h5>
                          <div className="bg-muted/30 rounded-md p-3">
                            <div className="grid grid-cols-4 gap-2 text-sm font-medium mb-2 text-muted-foreground">
                              <div>Chain</div>
                              <div>Residues</div>
                              <div>Atoms</div>
                              <div>% of Total</div>
                            </div>
                            <div className="max-h-[150px] overflow-auto pr-2">
                              {stats.chainInfo.map(chain => (
                                <div key={chain.chainId} className="grid grid-cols-4 gap-2 text-sm py-1 border-b border-muted/20 last:border-0">
                                  <div className="font-medium">{chain.chainId}</div>
                                  <div>{chain.residueCount}</div>
                                  <div>{chain.atomCount}</div>
                                  <div>
                                    {((chain.atomCount / stats.totalAtoms) * 100).toFixed(1)}%
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <Separator className="my-3" />

                        {/* Water and Ion Information */}
                        <div>
                          <h5 className="text-sm font-medium mb-2">Water and Ion Content</h5>
                          <div className="grid grid-cols-2 gap-3 text-sm bg-muted/30 p-3 rounded-md">
                            <div className="space-y-1">
                              <p className="text-muted-foreground">Water Molecules</p>
                              <p className="font-medium text-lg">{stats.waterCount}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-muted-foreground">Ion Count</p>
                              <p className="font-medium text-lg">{stats.ionCount}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground h-[400px] flex items-center justify-center">
                  Select a structure to view statistics
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component with error boundary
export default function Visualize() {
  return (
    <ErrorBoundary>
      <VisualizeContent />
    </ErrorBoundary>
  );
} 