import React, { useState, useRef } from 'react';
import { NGLViewer } from './NGLViewer';
import { ViewerControls } from './ViewerControls';
import { ViewerState } from '@/types/viewer';
import * as NGL from 'ngl';

export function StructureViewer() {
  const [pdbData, setPdbData] = useState<string>();
  const [viewerState, setViewerState] = useState<ViewerState>({
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

  const handleAtomSizeChange = (size: number) => {
    setViewerState(prev => ({ ...prev, atomSize: size }));
  };

  const handleLigandVisibilityChange = (visible: boolean) => {
    setViewerState(prev => ({ ...prev, showLigand: visible }));
  };

  const handleWaterIonVisibilityChange = (visible: boolean) => {
    setViewerState(prev => ({ ...prev, showWaterIon: visible }));
  };

  const handleCenter = () => {
    if (stageRef.current) {
      stageRef.current.autoView(1000);
    }
  };

  return (
    <div className="relative w-full h-full">
      <NGLViewer
        pdbData={pdbData}
        viewerState={viewerState}
        ref={stageRef}
      />
      <ViewerControls
        viewerState={viewerState}
        onAtomSizeChange={handleAtomSizeChange}
        onLigandVisibilityChange={handleLigandVisibilityChange}
        onWaterIonVisibilityChange={handleWaterIonVisibilityChange}
        onCenter={handleCenter}
        onFileUpload={handleFileUpload}
      />
    </div>
  );
} 