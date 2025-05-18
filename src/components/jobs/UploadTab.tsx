import React, { useState, useRef, useEffect, useCallback } from 'react';
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

interface UploadTabProps {
  onSubmit?: (data: UploadData) => void;
}

export interface UploadData {
  name: string;
  description: string;
  fileName: string;
  fileContent?: ArrayBuffer;
}

// Define types for Mol* from CDN
declare global {
  interface Window {
    molstar?: {
      Viewer: {
        create: (elementId: string, options: any) => Promise<any>;
      };
      PluginExtensions?: {
        mvs: {
          MVSData: {
            createBuilder: () => any;
          };
          loadMVS: (plugin: any, mvsData: any, options: any) => Promise<any>;
        };
      };
    };
  }
}

// Color mapping for amino acids
const aminoAcidColors = {
  // Hydrophobic residues
  'A': '#cccccc', // Alanine - light gray
  'V': '#cccccc', // Valine - light gray
  'L': '#cccccc', // Leucine - light gray
  'I': '#cccccc', // Isoleucine - light gray
  'M': '#cccccc', // Methionine - light gray
  'F': '#ffd700', // Phenylalanine - gold
  'Y': '#ffd700', // Tyrosine - gold
  'W': '#ffd700', // Tryptophan - gold
  'P': '#ffccd5', // Proline - light pink

  // Charged residues (negative)
  'D': '#ff0000', // Aspartic acid - red
  'E': '#ff0000', // Glutamic acid - red

  // Charged residues (positive)
  'K': '#0000ff', // Lysine - blue
  'R': '#0000ff', // Arginine - blue
  'H': '#8282d2', // Histidine - light blue

  // Polar residues
  'S': '#00ff00', // Serine - green
  'T': '#00ff00', // Threonine - green
  'N': '#00ff00', // Asparagine - green
  'Q': '#00ff00', // Glutamine - green
  'C': '#ffff00', // Cysteine - yellow
  'G': '#ff69b4', // Glycine - pink

  // Default
  'X': '#ffffff', // Unknown - white
};

const UploadTab: React.FC<UploadTabProps> = ({ onSubmit }) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<ArrayBuffer | null>(null);
  const [fileText, setFileText] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sequence, setSequence] = useState<string>('');
  const [viewMode, setViewMode] = useState<'structure' | 'sequence'>('structure');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fileInfo, setFileInfo] = useState<{lines: number, atoms: number}>({lines: 0, atoms: 0});
  const [molstarLoaded, setMolstarLoaded] = useState<boolean>(false);
  const [molstarViewer, setMolstarViewer] = useState<any>(null);
  
  const viewerRef = useRef<HTMLDivElement>(null);
  const sequenceContainerRef = useRef<HTMLDivElement>(null);
  
  // Load Mol* scripts dynamically
  useEffect(() => {
    if (molstarLoaded) return;

    // Load the CSS
    const linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.type = 'text/css';
    linkElement.href = 'https://cdn.jsdelivr.net/npm/molstar@latest/build/viewer/molstar.css';
    document.head.appendChild(linkElement);

    // Load the JS
    const scriptElement = document.createElement('script');
    scriptElement.src = 'https://cdn.jsdelivr.net/npm/molstar@latest/build/viewer/molstar.js';
    scriptElement.onload = () => {
      setMolstarLoaded(true);
    };
    document.body.appendChild(scriptElement);

    return () => {
      document.head.removeChild(linkElement);
      document.body.removeChild(scriptElement);
    };
  }, []);
  
  // Function to extract sequence from PDB - used outside render
  const extractSequenceFromPDB = useCallback((pdbText: string): string => {
    // Basic extraction of amino acid sequence from ATOM records
    // This is a simplified version and may not work for all PDB files
    const lines = pdbText.split('\n');
    let atomCount = 0;
    
    const aminoAcidMap: Record<string, string> = {
      'ALA': 'A', 'ARG': 'R', 'ASN': 'N', 'ASP': 'D', 'CYS': 'C',
      'GLN': 'Q', 'GLU': 'E', 'GLY': 'G', 'HIS': 'H', 'ILE': 'I',
      'LEU': 'L', 'LYS': 'K', 'MET': 'M', 'PHE': 'F', 'PRO': 'P',
      'SER': 'S', 'THR': 'T', 'TRP': 'W', 'TYR': 'Y', 'VAL': 'V',
      'UNK': 'X'
    };

    let currentChain = '';
    let currentResNum = '';
    let seq = '';

    for (const line of lines) {
      if (line.startsWith('ATOM')) {
        atomCount++;
        if (line.includes('CA')) {
          const chainId = line.substring(21, 22).trim();
          const resNum = line.substring(22, 26).trim();
          const resName = line.substring(17, 20).trim();
          
          // Only add if it's a new residue
          if (chainId !== currentChain || resNum !== currentResNum) {
            if (chainId !== currentChain && seq.length > 0) {
              seq += ':'; // Chain separator
            }
            currentChain = chainId;
            currentResNum = resNum;
            seq += aminoAcidMap[resName] || 'X';
          }
        }
      }
    }

    // Update file info in a separate useEffect, not directly here
    setFileInfo({
      lines: lines.length,
      atoms: atomCount
    });

    return seq;
  }, []);
  
  // Handle file processing success notification
  useEffect(() => {
    if (sequence && fileContent) {
      // Safe to show success notification after sequence and fileContent are set
      const timer = setTimeout(() => {
        toast.success('File processed successfully');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [sequence, fileContent]);
  
  // Initialize viewer when Mol* is loaded and we have a file
  useEffect(() => {
    if (!molstarLoaded || !fileContent || !uploadedFile || !viewerRef.current) return;
    
    let isMounted = true;
    
    // Create a unique ID for this viewer instance
    const viewerId = `molstar-viewer-${Date.now()}`;
    
    // Ensure the container has an ID
    if (viewerRef.current) {
      viewerRef.current.id = viewerId;
    }
    
    // Initialize viewer
    if (window.molstar) {
      window.molstar.Viewer
        .create(viewerId, { 
          layoutIsExpanded: false, 
          layoutShowControls: true,
          layoutShowSequence: true,
          layoutShowLog: false
        })
        .then(viewer => {
          if (!isMounted) {
            try {
              viewer.dispose();
            } catch (e) {
              console.error('Error disposing viewer after unmount:', e);
            }
            return;
          }
          
          setMolstarViewer(viewer);
          
          // Create a blob URL for the PDB file
          const blob = new Blob([fileContent], { type: 'chemical/x-pdb' });
          const blobUrl = URL.createObjectURL(blob);
          
          // Skip MVS extension if it's not available
          if (!window.molstar.PluginExtensions?.mvs) {
            // Fallback to direct loading
            viewer.loadStructureFromUrl(blobUrl, 'pdb')
              .catch(error => {
                console.error('Error loading structure directly:', error);
                if (isMounted) {
                  setTimeout(() => {
                    toast.error('Failed to visualize structure');
                  }, 0);
                }
              })
              .finally(() => {
                URL.revokeObjectURL(blobUrl);
              });
            return;
          }
          
          // Build an ad-hoc MVS view
          try {
            const builder = window.molstar.PluginExtensions.mvs.MVSData.createBuilder();
            
            // Use the blob URL to load the structure
            const structure = builder
              .url({ url: blobUrl, type: 'pdb' })
              .parse({ format: 'pdb' })
              .modelStructure({});
            
            // Create default representations
            structure
              .component({ selector: 'polymer' })
              .representation({ type: 'cartoon' })
              .color({ color: 'chain' });
            
            structure
              .component({ selector: 'ligand' })
              .representation({ type: 'ball_and_stick' })
              .color({ color: 'element' });
            
            const mvsData = builder.getState();
            
            // Load the MVS data
            window.molstar.PluginExtensions.mvs.loadMVS(
              viewer.plugin, 
              mvsData, 
              { 
                sourceUrl: blobUrl, 
                sanityChecks: true, 
                replaceExisting: false 
              }
            ).then(() => {
              URL.revokeObjectURL(blobUrl);
            }).catch(error => {
              console.error('Error loading structure:', error);
              if (isMounted) {
                setTimeout(() => {
                  toast.error('Failed to visualize structure');
                }, 0);
              }
              URL.revokeObjectURL(blobUrl);
            });
          } catch (e) {
            console.error('Error building MVS view:', e);
            URL.revokeObjectURL(blobUrl);
            if (isMounted) {
              setTimeout(() => {
                toast.error('Failed to create visualization');
              }, 0);
            }
          }
        })
        .catch(error => {
          console.error('Error initializing viewer:', error);
          if (isMounted) {
            setTimeout(() => {
              toast.error('Failed to initialize 3D viewer');
            }, 0);
          }
        });
    }
    
    return () => {
      isMounted = false;
      if (molstarViewer) {
        try {
          molstarViewer.dispose();
          setMolstarViewer(null);
        } catch (e) {
          console.error('Error disposing viewer:', e);
        }
      }
    };
  }, [molstarLoaded, fileContent, uploadedFile]);
  
  // Use a memoized onDrop function
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    
    // Check file extension
    if (!file.name.toLowerCase().endsWith('.pdb')) {
      setTimeout(() => toast.error('Please upload a .pdb file'), 0);
      return;
    }
    
    setUploadedFile(file);
    setName(file.name.split('.')[0]); // Set default name from filename
    
    // Read file as text for PDB parsing and sequence extraction
    const textReader = new FileReader();
    textReader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        setFileText(content);
        const extractedSequence = extractSequenceFromPDB(content);
        setSequence(extractedSequence);
      } catch (err) {
        console.error('Error processing file text:', err);
        setTimeout(() => toast.error('Error processing file content'), 0);
      }
    };
    textReader.onerror = () => {
      setTimeout(() => toast.error('Error reading file as text'), 0);
    };
    textReader.readAsText(file);
    
    // Also read file as ArrayBuffer for storage
    const arrayBufferReader = new FileReader();
    arrayBufferReader.onload = (e) => {
      const content = e.target?.result as ArrayBuffer;
      setFileContent(content);
    };
    arrayBufferReader.onerror = () => {
      setTimeout(() => toast.error('Error reading file as binary'), 0);
    };
    arrayBufferReader.readAsArrayBuffer(file);
  }, [extractSequenceFromPDB]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'chemical/x-pdb': ['.pdb'],
      'application/octet-stream': ['.pdb'],
      'text/plain': ['.pdb'] // Some browsers might recognize PDB as text files
    },
    maxFiles: 1
  });
  
  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uploadedFile || !fileContent) {
      setTimeout(() => toast.error('Please upload a PDB file first'), 0);
      return;
    }
    
    setIsSubmitting(true);
    
    // Create upload data
    const uploadData: UploadData = {
      name: name || (uploadedFile ? uploadedFile.name.split('.')[0] : ''),
      description,
      fileName: uploadedFile ? uploadedFile.name : '',
      fileContent: fileContent
    };
    
    // Call the onSubmit callback if provided
    if (onSubmit) {
      onSubmit(uploadData);
      setTimeout(() => toast.success('PDB file saved successfully'), 0);
    } else {
      setTimeout(() => toast.success('PDB file saved successfully'), 0);
    }
    
    setIsSubmitting(false);
  }, [uploadedFile, fileContent, name, description, onSubmit]);
  
  // Reset all state
  const handleReset = useCallback(() => {
    setUploadedFile(null);
    setFileContent(null);
    setFileText('');
    setSequence('');
    setName('');
    setDescription('');
    if (molstarViewer) {
      try {
        molstarViewer.dispose();
        setMolstarViewer(null);
      } catch (e) {
        console.error('Error disposing viewer:', e);
      }
    }
  }, [molstarViewer]);
  
  // Toggle fullscreen mode
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);
  
  // Render colored sequence - memoized to avoid re-renders
  const renderColoredSequence = useCallback(() => {
    if (!sequence) return null;
    
    // Handle multiple chains separated by colons
    const chains = sequence.split(':');
    
    return (
      <div className="font-mono text-sm overflow-x-auto">
        {chains.map((chain, chainIndex) => (
          <div key={chainIndex} className="mb-4">
            {chainIndex > 0 && <div className="text-xs text-muted-foreground mb-1">Chain {String.fromCharCode(65 + chainIndex)}</div>}
            <div className="flex flex-wrap">
              {[...chain].map((aa, i) => (
                <span 
                  key={i} 
                  className="inline-flex items-center justify-center w-8 h-8 m-0.5 rounded-md text-black font-bold"
                  style={{ backgroundColor: aminoAcidColors[aa] || aminoAcidColors['X'] }}
                >
                  {aa}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }, [sequence]);
  
  // Render the uploader if no file is uploaded yet
  if (!uploadedFile) {
    return (
      <div className="flex flex-col items-center justify-center p-6">
        <div 
          {...getRootProps()} 
          className={cn(
            "w-full relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed",
            "p-12 cursor-pointer hover:bg-accent/5 transition-colors",
            isDragActive ? "border-primary bg-accent/5" : "border-muted-foreground/25"
          )}
        >
          <input {...getInputProps()} />
          <Upload className={cn(
            "h-10 w-10 mb-4 transition-colors",
            isDragActive ? "text-primary" : "text-muted-foreground"
          )} />
          <p className="text-lg font-medium">
            {isDragActive ? "Drop the file here" : "Drag & drop a PDB file here"}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            or click to select file
          </p>
          <p className="text-xs text-muted-foreground/70 mt-4">
            Supports .pdb files only
          </p>
        </div>
      </div>
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
                      placeholder={uploadedFile ? uploadedFile.name.split('.')[0] : "Enter a name"}
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
                      <p className="font-medium">{uploadedFile?.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {uploadedFile ? `${(uploadedFile.size / 1024).toFixed(2)} KB` : ''}
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
            <div className="flex items-center justify-between p-4 border-b">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'structure' | 'sequence')} className="w-full">
                <TabsList className="grid w-[200px] grid-cols-2">
                  <TabsTrigger value="structure">3D Structure</TabsTrigger>
                  <TabsTrigger value="sequence">Sequence</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={toggleFullscreen}
                className="ml-2"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
            
            <TabsContent value="structure" className="m-0">
              {!molstarLoaded ? (
                <div className="flex items-center justify-center bg-gray-100 h-[500px]">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                    <p>Loading Mol* viewer...</p>
                  </div>
                </div>
              ) : (
                <div 
                  ref={viewerRef} 
                  className={cn(
                    "w-full relative",
                    isFullscreen ? "h-[calc(100vh-120px)]" : "h-[500px]"
                  )}
                />
              )}
            </TabsContent>
            
            <TabsContent value="sequence" className="m-0">
              <div 
                ref={sequenceContainerRef}
                className={cn(
                  "p-6 overflow-auto bg-white",
                  isFullscreen ? "h-[calc(100vh-120px)]" : "h-[500px]"
                )}
              >
                <div className="mb-4">
                  <h3 className="text-lg font-medium">
                    Sequence ({sequence.replace(/:/g, '').length} residues)
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {sequence.includes(':') ? `Multiple chains detected (${sequence.split(':').length})` : 'Single chain structure'}
                  </p>
                </div>
                {renderColoredSequence()}
              </div>
            </TabsContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UploadTab; 