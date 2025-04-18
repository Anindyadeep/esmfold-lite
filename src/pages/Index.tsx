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
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-center bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
          ESMFold lite
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mt-2">
          Upload and visualize 3D molecular structures from PDB files
        </p>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <Card className="p-4">
            <h2 className="text-xl font-semibold mb-4">Upload Files</h2>
            <FileUploader onFilesUploaded={handleFilesUploaded} />
            <FileList 
              files={files}
              onDelete={handleDeleteFile}
              onSelect={setSelectedFileIndex}
              selectedIndex={selectedFileIndex}
            />
          </Card>
          
          <Card className="p-4">
            <h2 className="text-xl font-semibold mb-4">View Settings</h2>
            <ViewControls 
              viewerState={viewerState}
              onAtomSizeChange={handleAtomSizeChange}
              onLigandVisibilityChange={handleLigandVisibilityChange}
              onWaterIonVisibilityChange={handleWaterIonVisibilityChange}
              onViewModeChange={handleViewModeChange}
              onCenter={() => {}}
              onFileUpload={(file) => handleFilesUploaded([file])}
            />
          </Card>
        </div>
        
        <div className="lg:col-span-9">
          <Card className="h-[600px] p-0 overflow-hidden">
            <NGLViewer 
              structures={loadedStructures}
              viewerState={viewerState}
            />
          </Card>
          
          {selectedFileIndex !== null && files[selectedFileIndex]?.molecule && (
            <Card className="mt-6 p-4">
              <Tabs defaultValue="info">
                <TabsList>
                  <TabsTrigger value="info">Molecule Info</TabsTrigger>
                  <TabsTrigger value="stats">Statistics</TabsTrigger>
                </TabsList>
                <TabsContent value="info" className="p-4">
                  <h3 className="text-lg font-medium">{files[selectedFileIndex].file.name}</h3>
                  <Separator className="my-2" />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">File Name</p>
                      <p className="font-medium">{files[selectedFileIndex].file.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Atom Count</p>
                      <p className="font-medium">{files[selectedFileIndex].molecule?.atoms.length}</p>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="stats" className="p-4">
                  <h3 className="text-lg font-medium">Element Distribution</h3>
                  <Separator className="my-2" />
                  <div className="max-h-40 overflow-y-auto">
                    {Object.entries(
                      files[selectedFileIndex].molecule?.atoms.reduce<Record<string, number>>((acc, atom) => {
                        const element = atom.element.trim();
                        acc[element] = (acc[element] || 0) + 1;
                        return acc;
                      }, {}) || {}
                    ).map(([element, count]) => (
                      <div key={element} className="flex justify-between py-1">
                        <span>{element || 'Unknown'}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
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
