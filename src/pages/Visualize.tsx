import React, { useMemo, useRef, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import ErrorBoundary from '@/components/ErrorBoundary';
import { SequenceViewer, ResidueInfo } from '@/components/SequenceViewer';

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

  // Add an effect to log structure details for debugging
  useEffect(() => {
    if (loadedStructures.length > 0) {
      console.log('Currently loaded structures:', loadedStructures.map(s => ({
        id: s.id,
        name: s.name,
        source: s.source,
        hasAtoms: s.molecule ? s.molecule.atoms.length : 0
      })));
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

  // Add a safe structure selection handler
  const handleStructureSelect = (index: number) => {
    if (index >= 0 && index < loadedStructures.length) {
      setSelectedFileIndex(index);
    }
  };

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
            onDeleteMolecule={deleteFile}
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
              
              const handleResidueClick = (index: number) => {
                const residueId = residueInfo[index]?.id;
                if (residueId !== undefined) {
                  setViewerState({
                    ...viewerState,
                    selectedResidues: [residueId]
                  });
                }
              };

              return (
                <SequenceViewer 
                  sequence={sequenceString}
                  residueData={residueInfo}
                  onResidueClick={handleResidueClick}
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
        
        {/* 3D Viewer */}
        <Card className="flex-1 p-0 overflow-hidden rounded-lg border bg-card shadow-sm relative aspect-square">
          <div className="absolute inset-0">
            <NGLViewer 
              structures={loadedStructures}
              viewerState={viewerState}
            />
          </div>
        </Card>
            
        {/* Split view with Distogram and Stats side by side */}
        <div className="grid grid-cols-2 gap-6">
          {/* Distogram Card - Left Side */}
          <Card className="p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h5 className="text-sm font-medium">Distogram</h5>
            </div>
            {selectedStructure?.molecule ? (
              <div className="h-[400px] w-full relative" ref={plotRef}>
                <Distogram 
                  molecule={selectedStructure.molecule!} 
                  data={selectedStructure.metadata?.distogram}
                  width={plotRef?.current?.offsetWidth || 500}
                  height={380}
                />
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground h-[400px] flex items-center justify-center">
                Select a structure to view its distogram
              </div>
            )}
          </Card>

          {/* Statistics Card - Right Side */}
          <Card className="p-4 overflow-auto max-h-[500px]">
            <div className="flex items-center justify-between mb-4">
              <h5 className="text-sm font-medium">Statistics</h5>
            </div>
            {selectedStructure?.molecule ? (
              <div className="space-y-4">
                {(() => {
                  const stats = calculateMoleculeStats(selectedStructure.molecule!);
                  
                  return (
                    <div key={selectedStructure.id}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium">{selectedStructure.name}</h4>
                        <Badge variant={selectedStructure.source === 'file' ? "outline" : "secondary"}>
                          {selectedStructure.source === 'file' ? 'File' : 'Job'}
                        </Badge>
                      </div>

                      <Separator className="my-3" />
                      
                      {/* Atom Statistics */}
                      <div className="mb-3">
                        <h5 className="text-sm font-medium mb-1">Atom Statistics</h5>
                        <div className="grid grid-cols-2 gap-2 text-sm">
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

                      <Separator className="my-3" />

                      {/* Chain Information */}
                      <div className="mb-3">
                        <h5 className="text-sm font-medium mb-1">Chain Information</h5>
                        <div className="grid grid-cols-4 gap-2 text-sm font-medium mb-1">
                          <div>Chain</div>
                          <div>Residues</div>
                          <div>Atoms</div>
                          <div>% of Total</div>
                        </div>
                        <div className="max-h-[150px] overflow-auto pr-2">
                          {stats.chainInfo.map(chain => (
                            <div key={chain.chainId} className="grid grid-cols-4 gap-2 text-sm">
                              <div>{chain.chainId}</div>
                              <div>{chain.residueCount}</div>
                              <div>{chain.atomCount}</div>
                              <div>
                                {((chain.atomCount / stats.totalAtoms) * 100).toFixed(1)}%
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Separator className="my-3" />

                      {/* Water and Ion Information */}
                      <div>
                        <h5 className="text-sm font-medium mb-1">Water and Ion Content</h5>
                        <div className="grid grid-cols-2 gap-2 text-sm">
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
              <div className="text-center py-4 text-sm text-muted-foreground h-[400px] flex items-center justify-center">
                Select a structure to view its statistics
              </div>
            )}
          </Card>
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