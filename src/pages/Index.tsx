import React, { useState, useEffect } from 'react';
import FileUploader from '@/components/FileUploader';
import FileList from '@/components/FileList';
import { ViewControls } from '@/components/ViewControls';
import { NGLViewer } from '@/components/NGLViewer';
import { parsePDB, Molecule } from '@/utils/pdbParser';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ViewMode } from '@/types/viewer';

const Index = () => {
  // State for files and structures
  const [files, setFiles] = useState<{ file: File; molecule?: Molecule }[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null);
  const [loadedStructures, setLoadedStructures] = useState<{ id: string; pdbData: string }[]>([]);
  
  // Viewer state
  const [viewerState, setViewerState] = useState({
    atomSize: 1.0,
    showLigand: true,
    showWaterIon: false,
    viewMode: 'cartoon' as ViewMode,
  });

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

  const handleAtomSizeChange = (size: number) => {
    setViewerState(prev => ({ ...prev, atomSize: size }));
  };

  const handleLigandVisibilityChange = (visible: boolean) => {
    setViewerState(prev => ({ ...prev, showLigand: visible }));
  };

  const handleWaterIonVisibilityChange = (visible: boolean) => {
    setViewerState(prev => ({ ...prev, showWaterIon: visible }));
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewerState(prev => ({ ...prev, viewMode: mode }));
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container flex h-16 items-center gap-4 px-6">
          <h1 className="text-xl font-semibold tracking-tight">
            LiteFold
          </h1>
          <p className="text-sm text-muted-foreground ml-4">
            Molecular Structure Visualization
          </p>
        </div>
      </header>
      
      <main className="flex-1 overflow-hidden">
        <div className="container flex gap-6 p-6 h-[calc(100vh-4rem)]">
          <div className="w-80 flex flex-col gap-6">
            <Card className="p-5">
              <h2 className="text-lg font-medium mb-4">Upload Files</h2>
              <FileUploader onFilesUploaded={handleFilesUploaded} />
              <div className="mt-4">
                <FileList 
                  files={files}
                  onDelete={handleDeleteFile}
                  onSelect={setSelectedFileIndex}
                  selectedIndex={selectedFileIndex}
                />
              </div>
            </Card>
            
            <Card className="p-5 flex-shrink-0">
              <h2 className="text-lg font-medium mb-4">View Settings</h2>
              <ViewControls 
                viewerState={viewerState}
                onAtomSizeChange={handleAtomSizeChange}
                onLigandVisibilityChange={handleLigandVisibilityChange}
                onWaterIonVisibilityChange={handleWaterIonVisibilityChange}
                onViewModeChange={handleViewModeChange}
                onCenter={() => {}}
              />
            </Card>
          </div>
          
          <div className="flex-1 flex flex-col gap-6 min-h-[600px]">
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
                    <div className="grid gap-4">
                      <div className="space-y-1">
                        <h3 className="text-sm font-medium leading-none">
                          Statistical Analysis
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Detailed statistics about the molecular structure
                        </p>
                      </div>
                      <Separator />
                      {/* Add your statistics content here */}
                    </div>
                  </TabsContent>
                </Tabs>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
