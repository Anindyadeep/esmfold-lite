import React, { useState, useRef } from 'react';
import { VisualizationWrapper } from './VisualizationWrapper';
import { ViewControls } from '@/components/ViewControls';
import { ViewerState, ViewMode, ColorScheme } from '@/types/viewer';

export function StructureViewer() {
  const [pdbData, setPdbData] = useState<string>();
  const [viewerState, setViewerState] = useState<ViewerState>({
    viewMode: 'default' as ViewMode,
    colorScheme: 'DEFAULT' as ColorScheme,
    atomSize: 1.0,
    showLigand: true,
    showWaterIon: false,
  });
  const stageRef = useRef<any>(null);

  const handleFileUpload = async (file: File) => {
    try {
      const text = await file.text();
      setPdbData(text);
    } catch (error) {
      console.error('Error reading file:', error);
    }
  };

  const handleFilesUploaded = async (files: File[]) => {
    if (files.length > 0) {
      await handleFileUpload(files[0]);
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

  return (
    <div className="relative w-full h-full">
      <VisualizationWrapper
        structures={pdbData ? [{ id: 'uploaded.pdb', pdbData, name: 'Uploaded File', source: 'file' }] : []}
        viewerState={viewerState}
        ref={stageRef}
      />
      <ViewControls
        viewerState={viewerState}
        molecules={[]}
        selectedMoleculeIndex={null}
        onViewModeChange={(mode) => setViewerState(prev => ({ ...prev, viewMode: mode }))}
        onColorSchemeChange={(scheme) => setViewerState(prev => ({ ...prev, colorScheme: scheme }))}
        onAtomSizeChange={handleAtomSizeChange}
        onLigandVisibilityChange={handleLigandVisibilityChange}
        onWaterIonVisibilityChange={handleWaterIonVisibilityChange}
        onFilesUploaded={handleFilesUploaded}
        onDeleteMolecule={() => {}} // No-op since we don't have molecules to delete
        onSelectMolecule={() => {}} // No-op since we don't have molecules to select
      />
    </div>
  );
} 