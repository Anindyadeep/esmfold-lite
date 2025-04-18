import React, { useState } from 'react';
import { ViewerControls } from './ViewerControls';
import { NGLViewport } from './NGLViewport';
import { Card } from '../ui/card';
import { Molecule } from '@/utils/pdbParser';
import { CompletedJobs } from '../CompletedJobs';

export interface ViewerState {
  viewMode: string;
  atomSize: number;
  showLigand: boolean;
  showWaterIon: boolean;
  colorScheme: number;
}

export function MoleculeViewer() {
  // Main state for the viewer
  const [viewerState, setViewerState] = useState<ViewerState>({
    viewMode: 'cartoon',
    atomSize: 1.5,
    showLigand: true,
    showWaterIon: false,
    colorScheme: 0
  });

  // State for loaded molecules
  const [molecules, setMolecules] = useState<{ file: File; molecule?: Molecule }[]>([]);
  const [selectedMoleculeIndex, setSelectedMoleculeIndex] = useState<number | null>(null);

  // Handlers for viewer state changes
  const handleViewModeChange = (mode: string) => {
    setViewerState(prev => ({ ...prev, viewMode: mode }));
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

  const handleColorSchemeChange = (scheme: number) => {
    setViewerState(prev => ({ ...prev, colorScheme: scheme }));
  };

  // File handling
  const handleFilesUploaded = (files: File[]) => {
    const newMolecules = files.map(file => ({ file }));
    setMolecules(prev => [...prev, ...newMolecules]);
    
    // Select the first file if none selected
    if (selectedMoleculeIndex === null && newMolecules.length > 0) {
      setSelectedMoleculeIndex(molecules.length);
    }
  };

  const handleDeleteMolecule = (index: number) => {
    setMolecules(prev => {
      const newMolecules = [...prev];
      newMolecules.splice(index, 1);
      return newMolecules;
    });

    if (selectedMoleculeIndex === index) {
      setSelectedMoleculeIndex(molecules.length > 1 ? 0 : null);
    } else if (selectedMoleculeIndex !== null && selectedMoleculeIndex > index) {
      setSelectedMoleculeIndex(selectedMoleculeIndex - 1);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-center bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
          LiteFold
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mt-2">
          Upload and visualize 3D molecular structures from PDB files
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left sidebar with controls */}
        <div className="lg:col-span-3 space-y-6">
          <ViewerControls
            viewerState={viewerState}
            molecules={molecules}
            selectedMoleculeIndex={selectedMoleculeIndex}
            onViewModeChange={handleViewModeChange}
            onAtomSizeChange={handleAtomSizeChange}
            onLigandVisibilityChange={handleLigandVisibilityChange}
            onWaterIonVisibilityChange={handleWaterIonVisibilityChange}
            onColorSchemeChange={handleColorSchemeChange}
            onFilesUploaded={handleFilesUploaded}
            onDeleteMolecule={handleDeleteMolecule}
            onSelectMolecule={setSelectedMoleculeIndex}
          />
          <CompletedJobs />
        </div>

        {/* Main viewer area */}
        <div className="lg:col-span-9">
          <Card className="h-[600px] p-0 overflow-hidden">
            <NGLViewport
              molecule={selectedMoleculeIndex !== null ? molecules[selectedMoleculeIndex]?.molecule : undefined}
              viewerState={viewerState}
            />
          </Card>
        </div>
      </div>
    </div>
  );
} 