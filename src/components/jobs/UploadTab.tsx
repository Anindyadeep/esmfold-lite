import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Maximize2, Minimize2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MolStarViewer } from '../MolStarViewer';
import { parsePDB, Molecule } from '@/utils/pdbParser';
import { VisualizationWrapper } from '../VisualizationWrapper';
import FileUploader from '../FileUploader';
import { SequenceViewer, ResidueInfo } from '../SequenceViewer';

interface UploadTabProps {
  onSubmit?: (data: UploadData) => void;
}

export interface UploadData {
  name: string;
  description: string;
  fileName: string;
  fileContent?: ArrayBuffer;
  molecule?: Molecule;
}

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

const UploadTab: React.FC<UploadTabProps> = ({ onSubmit }) => {
  const [uploadedFile, setUploadedFile] = useState<boolean | null>(false);
  const [fileContent, setFileContent] = useState<ArrayBuffer | null>(null);
  const [fileText, setFileText] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sequence, setSequence] = useState<string>('');
  const [viewMode, setViewMode] = useState<'structure' | 'sequence'>('structure');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fileInfo, setFileInfo] = useState<{lines: number, atoms: number}>({lines: 0, atoms: 0});
  const [molecule, setMolecule] = useState<Molecule | null>(null);
  const [residueInfo, setResidueInfo] = useState<ResidueInfo[]>([]);

  const [files, setFiles] = useState([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState(-1);
  const [loadedStructures, setLoadedStructures] = useState([]);
  const [viewerState, setViewerState] = useState({});
  
  const molstarRef = useRef<any>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // Helper functions to replace the store actions
  const addFiles = (newFiles) => {
    setFiles(prevFiles => [...prevFiles, ...newFiles]);
  };
  
  const updateFile = (index, updates) => {
    setFiles(prevFiles => prevFiles.map((file, i) => 
      i === index ? {...file, ...updates} : file
    ));
  };
  
  const addLoadedStructures = (structures) => {
    setLoadedStructures(prev => [...prev, ...structures]);
  };
  
  const deleteFile = (index) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
    if (selectedFileIndex === index) {
      setSelectedFileIndex(-1);
    }
  };
  
  const deleteLoadedStructure = (index) => {
    setLoadedStructures(prev => prev.filter((_, i) => i !== index));
  };
  
  const getSelectedStructure = () => {
    return loadedStructures[0];
  };
  
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
        
        // Parse the PDB file
        const parsedMolecule = await parsePDB(file);
        
        console.log('Parsed molecule:', parsedMolecule ? 
          `${parsedMolecule.atoms.length} atoms` : 
          'No molecule parsed');
          
        return { file, molecule: parsedMolecule, pdbData: fileData };
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
      
      // Extract residue information for sequence viewer
      const residuesById = molecule?.atoms
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
        }, {} as Record<number, { id: number, name: string, chain: string }>) || {};

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
      
      return {
        id: uniqueId,
        name: file.name,
        pdbData,
        source: 'file' as const,
        molecule,
        sequence: sequenceString,
        residueInfo
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
    setUploadedFile(true);
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

  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uploadedFile || !fileContent || !molecule) {
      toast.error('Please upload a valid PDB file first');
      return;
    }
    
    setIsSubmitting(true);
    
    toast.success('PDB file saved successfully');
    setIsSubmitting(false);
  }, [uploadedFile, fileContent, molecule, name, description, onSubmit]);
  
  // Reset all state
  const handleReset = useCallback(() => {
    setUploadedFile(false);
    setFileContent(null);
    setFileText('');
    setSequence('');
    setName('');
    setDescription('');
    setIsSubmitting(false);
    setViewMode('structure');
    setIsFullscreen(false);
    setFileInfo({ lines: 0, atoms: 0 });
    setMolecule(null);
    setResidueInfo([]);
  
    setFiles([]);
    setSelectedFileIndex(-1);
    setLoadedStructures([]);
    setViewerState({});
  
    if (molstarRef.current) {
      molstarRef.current.clear(); // assuming molstar viewer supports a `clear()` method
    }
  
    setIsFullScreen(false);
  
    if (canvasContainerRef.current) {
      // Optionally clear the container or reset any style/DOM changes
      canvasContainerRef.current.innerHTML = '';
    }
  }, []);
  

  // Toggle fullscreen mode
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
    // Reset camera after a small delay to ensure the viewer has resized
    setTimeout(resetCamera, 100);
  }, []);

  // Render the uploader if no file is uploaded yet
  if (!uploadedFile) {
    return (
      <FileUploader onFilesUploaded={handleFilesUploaded} num_files={1}/>
    );
  }
  
  // Render the form and info when a file has been uploaded
  return (
    <div className={cn(
      "transition-all duration-300",
      isFullscreen ? "fixed inset-0 z-50 bg-background p-6" : "p-6"
    )}>
      <div className={cn(
        "grid gap-6",
        isFullscreen ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"
      )}>
        {/* Left Column: Form */}
        <div className={cn(isFullscreen && "hidden")}>
          <form onSubmit={handleSubmit}>
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="structure-name">Name</Label>
                    <Input
                      id="structure-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={files[0].file.name.split('.')[0]}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="structure-description">Description</Label>
                    <Textarea
                      id="structure-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Optional description"
                      className="mt-1 resize-none"
                      rows={3}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="mb-6">
              <CardContent className="pt-6">
                <Label>File</Label>
                <div className="mt-2 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{files[0].file.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {`${(files[0].file.size / 1024).toFixed(2)} KB`}
                      </p>
                    </div>
                    <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium">
                      PDB
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </div>
        
        {/* Right Column: Viewer */}
        <div>
          <Card className="overflow-hidden">
              <Tabs value={viewMode} onValueChange={(v) => {
                console.log('Tab changed to:', v);
                setViewMode(v as 'structure' | 'sequence');
              }} className="w-full">
            <div className="flex items-center justify-between p-4 border-b">
                <TabsList className="grid w-[200px] grid-cols-2">
                  <TabsTrigger value="structure">3D Structure</TabsTrigger>
                  <TabsTrigger value="sequence">Sequence</TabsTrigger>
                </TabsList>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={toggleFullscreen}
                className="ml-2"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
            <TabsContent value="structure" className="m-0" id='testing-table-component'>
              <div className="h-[820px] relative" ref={canvasContainerRef}>
                <VisualizationWrapper 
                      ref={molstarRef}
                      structures={loadedStructures as any}
                      viewerState={{
                        viewMode: 'default',
                        colorScheme: 'DEFAULT',
                        showLigand: true,
                        showWaterIon: true,
                        atomSize: 1.0
                      }}
                      key={`viewer-${loadedStructures.map(s => s.id).join('-')}`}
                  />
                </div>
            </TabsContent>
            
            <TabsContent value="sequence" className="m-0">
              <div className={cn(
                "p-6 overflow-auto bg-white",
                isFullscreen ? "h-[calc(100vh-120px)]" : "h-[500px]"
              )}>
                {selectedStructure?.sequence && (
                  <SequenceViewer 
                    sequence={selectedStructure.sequence}
                    residueData={selectedStructure.residueInfo}
                    onResidueHover={(index) => {
                      if (index === null) {
                        setViewerState(prev => ({
                          ...prev,
                          selectedResidues: []
                        }));
                      } else {
                        const residueId = selectedStructure.residueInfo[index]?.id;
                        if (residueId !== undefined) {
                          setViewerState(prev => ({
                            ...prev,
                            selectedResidues: [residueId]
                          }));
                        }
                      }
                    }}
                  />
                )}
              </div>
            </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
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

export default UploadTab;