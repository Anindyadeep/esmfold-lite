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
import { Maximize, Minimize, Trash2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import StructureComparison from '@/components/StructureComparison';

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

// Add this component to display the loaded structures with delete buttons
function LoadedStructuresList({ 
  structures, 
  onSelectStructure, 
  onDeleteStructure,
  selectedStructureId
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-medium">Loaded Structures</h3>
        <Badge>{structures.length}</Badge>
      </div>
      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
        {structures.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-2">
            No structures loaded
          </div>
        ) : (
          structures.map((structure, index) => (
            <div 
              key={structure.id} 
              className={`flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer ${structure.id === selectedStructureId ? 'bg-muted/50 border border-muted-foreground/20' : ''}`}
              onClick={() => onSelectStructure(index)}
            >
              <div className="flex items-center space-x-2">
                <Badge variant={
                  structure.source === 'file' ? "outline" : 
                  structure.source === 'aligned' ? "default" : 
                  "secondary"
                } className="px-1.5 py-0 text-xs">
                  {structure.source === 'file' ? 'file' : 
                   structure.source === 'aligned' ? 'aligned' : 
                   'job'}
                </Badge>
                {structure.source === 'job' && structure.metadata?.model && (
                  <Badge variant={
                    structure.metadata.model === 'esm3' ? "default" :
                    structure.metadata.model === 'alphafold2' ? "secondary" : 
                    "outline"
                  } className="px-1.5 py-0 text-xs">
                    {structure.metadata.model === 'esm3' ? 'ESM-3' :
                     structure.metadata.model === 'alphafold2' ? 'AlphaFold2' :
                     structure.metadata.model}
                  </Badge>
                )}
                <span className="text-sm truncate max-w-[160px]">{structure.name}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteStructure(index, structure);
                  }}
                  title="Remove structure"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

// Add this helper function before the VisualizeContent function
const getConfidenceColor = (plddt: number): string => {
  if (plddt >= 90) return 'bg-green-500';
  if (plddt >= 70) return 'bg-blue-500';
  if (plddt >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
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
    deleteLoadedStructure,
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
        // Read file content as text
        const fileData = await file.text();
        
        if (!fileData || fileData.length === 0) {
          console.error('Error: Empty file content for', file.name);
          return { file, error: 'File content is empty' };
        }
        
        console.log(`Read ${fileData.length} bytes from ${file.name}`);
        
        // For CIF files, we don't need to parse them as they'll be handled directly by NGL
        const isCifFile = file.name.toLowerCase().endsWith('.cif');
        const molecule = isCifFile ? null : await parsePDB(file);
        
        if (isCifFile) {
          console.log('CIF file detected, skipping PDB parsing');
        } else {
          console.log('Parsed molecule:', molecule ? 
            `${molecule.atoms.length} atoms` : 
            'No molecule parsed');
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
      failedFiles.forEach(f => {
        toast.error(`Failed to process ${f.file.name}: ${f.error}`);
      });
    }

    if (successfulFiles.length === 0) {
      console.error('No files were processed successfully');
      return;
    }

    // Add files to state
    addFiles(successfulFiles.map(({ file, molecule }) => ({ file, molecule })));
    
    // Add structures for visualization with unique IDs including timestamp
    const newStructures = successfulFiles.map(({ file, molecule, pdbData }) => {
      const uniqueId = `file-${file.name}-${Date.now()}`;
      console.log(`Creating structure with ID ${uniqueId}, PDB data length: ${pdbData?.length || 0}`);
      
      return {
        id: uniqueId,
        name: file.name,
        pdbData,
        source: 'file' as const,
        molecule
      };
    });
    
    console.log('Adding structures to store:', newStructures.map(s => ({
      id: s.id,
      name: s.name,
      pdbDataLength: s.pdbData?.length || 0
    })));
    
    // Add all structures to the store
    addLoadedStructures(newStructures);

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

  // Add the handler for deleting a structure
  const handleDeleteStructure = useCallback((index: number, structure: any) => {
    console.log(`Visualize: About to delete structure at index ${index}:`, structure.id);
    
    // Delete structure directly without confirmation prompt
    deleteLoadedStructure(index);
    
    // Show success message for all structures
    if (structure.source === 'job') {
      toast.success('Structure removed from visualization');
    }
    
    // If we just deleted the selected structure, select another one if available
    if (selectedFileIndex === index) {
      if (loadedStructures.length > 1) {
        // Select the previous structure, or the first one if we deleted the first
        const newIndex = index === 0 ? 0 : index - 1;
        setSelectedFileIndex(newIndex);
      } else {
        // If no structures left, clear selection
        setSelectedFileIndex(null);
      }
    } else if (selectedFileIndex !== null && selectedFileIndex > index) {
      // If we deleted a structure before the selected one, adjust the index
      setSelectedFileIndex(selectedFileIndex - 1);
    }
  }, [deleteLoadedStructure, loadedStructures.length, selectedFileIndex, setSelectedFileIndex]);

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left sidebar */}
      <div className="col-span-3 space-y-6">
        <Card className="p-4">
          <FileUploader onFilesUploaded={handleFilesUploaded} num_files={3} />
        </Card>
        
        <Card className="p-4 min-h-[180px]">
          <JobSelector />
        </Card>
        
        <Card className="p-4 min-h-[180px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium">Search from RCSB PDB</h3>
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. 6VXX or insulin"
                  disabled
                />
                <Button variant="outline" disabled>Search</Button>
              </div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <Info className="inline-block w-4 h-4 mr-1" />
                Directly search protein structures from PDB
              </p>
              <div className="flex justify-center items-center mt-3 text-center">
                <Badge variant="outline" className="px-4 py-2">
                  Coming Soon
                </Badge>
              </div>
            </div>
          </div>
        </Card>
        
        {/* Add the LoadedStructuresList component */}
        <LoadedStructuresList 
          structures={loadedStructures}
          onSelectStructure={handleStructureSelect}
          onDeleteStructure={handleDeleteStructure}
          selectedStructureId={selectedStructure?.id}
        />
        
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
              <Badge variant={
                selectedStructure.source === 'file' ? "outline" : 
                selectedStructure.source === 'aligned' ? "default" : 
                "secondary"
              }>
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
                    <TabsTrigger value="stats">Structure Statistics</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="canvas" className="m-0">
                  <div className="h-[820px] relative" ref={canvasContainerRef}>
                    {/* <button 
                      onClick={toggleFullScreen}
                      className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-background/80 hover:bg-background shadow-md transition-colors"
                      title={isFullScreen ? "Exit Full Screen" : "Enter Full Screen"}
                      aria-label={isFullScreen ? "Exit Full Screen" : "Enter Full Screen"}
                    >
                      {isFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
                    </button> */}
                    <VisualizationWrapper 
                      ref={molstarRef}
                      structures={loadedStructures as any}
                      viewerState={viewerState}
                      key={`viewer-${loadedStructures.map(s => s.id).join('-')}`}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="distogram" className="m-0">
                  <div className="p-4 space-y-4">
                    {/* Add persistent explanation card at the top */}
                    <div className="bg-muted/30 p-3 rounded-md text-sm mb-2">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">Understanding Distance Matrices</h4>
                        <Badge variant="outline">Reference</Badge>
                      </div>
                      <p className="text-muted-foreground mb-2">
                        A distance matrix shows pairwise distances between amino acid residues in a protein structure. 
                        Dark blue/purple areas indicate residues that are close in 3D space, while light colors show distant residues.
                      </p>
                      <div className="grid grid-cols-2 gap-4 mt-2 text-xs">
                        <div>
                          <span className="font-medium">Key Features:</span>
                          <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground">
                            <li>Diagonal line: Each residue's distance to itself (0Å)</li>
                            <li>Alpha helices: Dark bands parallel to diagonal</li>
                            <li>Beta sheets: Dark bands perpendicular to diagonal</li>
                            <li>Tertiary contacts: Dark spots away from diagonal</li>
                          </ul>
                        </div>
                        <div>
                          <span className="font-medium">Color Scale:</span>
                          <div className="h-3 w-full mt-2 rounded-sm bg-gradient-to-r from-[#000080] via-[#4B0082] via-[#800080] via-[#9400D3] to-[#F8F8FF]"></div>
                          <div className="flex justify-between text-xs mt-1 text-muted-foreground">
                            <span>Close (0Å)</span>
                            <span>Distant (20Å+)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  
                    <div className="h-[520px]">
                      {selectedStructure?.molecule ? (
                        <div className="h-full w-full relative" ref={plotRef}>
                          {(() => {
                            // Debug distogram data
                            console.log('Distogram data for structure:', {
                              id: selectedStructure.id,
                              name: selectedStructure.name,
                              source: selectedStructure.source,
                              hasDistogram: !!selectedStructure.metadata?.distogram,
                              distogramType: selectedStructure.metadata?.distogram ? typeof selectedStructure.metadata.distogram : 'undefined',
                              distogramLength: selectedStructure.metadata?.distogram ? 
                                Array.isArray(selectedStructure.metadata.distogram) ? selectedStructure.metadata.distogram.length : 
                                (typeof selectedStructure.metadata.distogram === 'object' ? 'object with keys: ' + Object.keys(selectedStructure.metadata.distogram).join(', ') : 'unknown')
                                : 0
                            });
                            
                            // Always use the selected structure's molecule for distogram calculation as fallback
                            return (
                              <Distogram 
                                molecule={selectedStructure.molecule!} 
                                data={selectedStructure.metadata?.distogram}
                                width={plotRef?.current?.offsetWidth || 500}
                                height={plotRef?.current?.offsetHeight || 500}
                                source={selectedStructure.source as 'file' | 'job'}
                              />
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full">
                          <div className="text-center py-6 text-sm text-muted-foreground">
                            <p>Select a structure to view its distance matrix</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="stats" className="m-0">
                  <div className="p-6 h-[600px] overflow-auto">
                    {selectedStructure?.molecule ? (
                      <div className="space-y-6">
                        {(() => {
                          const stats = calculateMoleculeStats(selectedStructure.molecule!);
                          
                          return (
                            <div key={selectedStructure.id}>
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-base font-medium">{selectedStructure.name}</h4>
                                <div className="flex items-center gap-2">
                                  <Badge variant={
                                    selectedStructure.source === 'file' ? "outline" : 
                                    selectedStructure.source === 'aligned' ? "default" : 
                                    "secondary"
                                  }>
                                    {selectedStructure.source === 'file' ? 'File' : 
                                     selectedStructure.source === 'aligned' ? 'Aligned' : 
                                     'Job'}
                                  </Badge>
                                  {selectedStructure.source === 'job' && selectedStructure.metadata?.model && (
                                    <Badge variant={
                                      selectedStructure.metadata.model === 'esm3' ? "default" :
                                      selectedStructure.metadata.model === 'alphafold2' ? "secondary" : 
                                      "outline"
                                    }>
                                      {selectedStructure.metadata.model === 'esm3' ? 'ESM-3' :
                                      selectedStructure.metadata.model === 'alphafold2' ? 'AlphaFold2' :
                                      selectedStructure.metadata.model}
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <Separator className="my-5" />
                              
                              {/* Atom Statistics */}
                              <div className="mb-6">
                                <h5 className="text-sm font-medium mb-3">Atom Statistics</h5>
                                <div className="grid grid-cols-2 gap-5 text-sm bg-muted/30 p-4 rounded-md">
                                  <div className="space-y-1">
                                    <p className="text-muted-foreground">Total Atoms</p>
                                    <p className="font-medium text-2xl">{stats.totalAtoms}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-muted-foreground">Unique Elements</p>
                                    <p className="font-medium text-lg">{stats.uniqueElements.join(', ')}</p>
                                  </div>
                                </div>
                              </div>

                              <Separator className="my-5" />

                              {/* Chain Information */}
                              <div className="mb-6">
                                <h5 className="text-sm font-medium mb-3">Chain Information</h5>
                                <div className="bg-muted/30 rounded-md p-4">
                                  <div className="grid grid-cols-4 gap-3 text-sm font-medium mb-3 text-muted-foreground">
                                    <div>Chain</div>
                                    <div>Residues</div>
                                    <div>Atoms</div>
                                    <div>% of Total</div>
                                  </div>
                                  <div className="max-h-[200px] overflow-auto pr-2">
                                    {stats.chainInfo.map(chain => (
                                      <div key={chain.chainId} className="grid grid-cols-4 gap-3 text-sm py-2 border-b border-muted/20 last:border-0">
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

                              <Separator className="my-5" />

                              {/* Water and Ion Information */}
                              <div>
                                <h5 className="text-sm font-medium mb-3">Water and Ion Content</h5>
                                <div className="grid grid-cols-2 gap-5 text-sm bg-muted/30 p-4 rounded-md">
                                  <div className="space-y-1">
                                    <p className="text-muted-foreground">Water Molecules</p>
                                    <p className="font-medium text-2xl">{stats.waterCount}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-muted-foreground">Ion Count</p>
                                    <p className="font-medium text-2xl">{stats.ionCount}</p>
                                  </div>
                                </div>
                              </div>
                              
                              {/* pLDDT Score section - Only show for job structures */}
                              {selectedStructure.source === 'job' && selectedStructure.metadata?.plddt_score !== undefined && (
                                <>
                                  <Separator className="my-5" />
                                  <div>
                                    <h5 className="text-sm font-medium mb-3">Model Confidence</h5>
                                    <div className="bg-muted/30 p-4 rounded-md">
                                      <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm text-muted-foreground">pLDDT Score</span>
                                        <span className="text-base font-medium">
                                          {selectedStructure.metadata.plddt_score.toFixed(1)}
                                        </span>
                                      </div>
                                      <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                                        <div 
                                          className={`h-full ${getConfidenceColor(selectedStructure.metadata.plddt_score)}`}
                                          style={{ width: `${Math.min(100, selectedStructure.metadata.plddt_score)}%` }}
                                        />
                                      </div>
                                      <div className="flex justify-between text-xs text-muted-foreground mt-2">
                                        <span>Low</span>
                                        <span>Confident</span>
                                      </div>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-sm text-muted-foreground h-full flex items-center justify-center">
                        Select a structure to view statistics
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
          
          {/* Statistics Card - Right side */}
          <div className="col-span-4 space-y-6">
            <Card className="p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h5 className="text-sm font-semibold">Metrics & Comparison</h5>
                <Badge variant="outline">Analysis</Badge>
              </div>
              
              <div className="space-y-6">
                {/* pLDDT Score section - Only show for job structures */}
                {selectedStructure?.molecule && selectedStructure.source === 'job' && selectedStructure.metadata?.plddt_score !== undefined && (
                  <div>
                    <h5 className="text-sm font-medium mb-2">Model Confidence</h5>
                    <div className="bg-muted/30 p-3 rounded-md">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-muted-foreground">pLDDT Score</span>
                        <span className="text-sm font-medium">
                          {selectedStructure.metadata.plddt_score.toFixed(1)}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${getConfidenceColor(selectedStructure.metadata.plddt_score)}`}
                          style={{ width: `${Math.min(100, selectedStructure.metadata.plddt_score)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Low</span>
                        <span>Confident</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Structure Comparison component */}
                <div>
                  <h5 className="text-sm font-medium mb-2">Structure Comparison</h5>
                  <StructureComparison />
                </div>
              </div>
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