import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { ViewerState, ViewMode, ColorScheme } from '@/types/viewer';
import { Molecule } from '@/utils/pdbParser';
import { useVisualizeStore } from '@/store/visualizeStore';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"

interface ViewerControlsProps {
  viewerState: ViewerState;
  molecules: { file: File; molecule?: Molecule }[];
  selectedMoleculeIndex: number | null;
  onViewModeChange: (mode: ViewMode) => void;
  onAtomSizeChange: (size: number) => void;
  onLigandVisibilityChange: (visible: boolean) => void;
  onWaterIonVisibilityChange: (visible: boolean) => void;
  onColorSchemeChange: (scheme: ColorScheme) => void;
  onFilesUploaded: (files: File[]) => void;
  onDeleteMolecule: (index: number) => void;
  onSelectMolecule: (index: number) => void;
}

export function ViewControls({
  viewerState,
  molecules,
  selectedMoleculeIndex,
  onViewModeChange,
  onAtomSizeChange,
  onLigandVisibilityChange,
  onWaterIonVisibilityChange,
  onColorSchemeChange,
  onFilesUploaded,
  onDeleteMolecule,
  onSelectMolecule
}: ViewerControlsProps) {
  // Get the loaded structures from the store
  const { loadedStructures, setSelectedFileIndex } = useVisualizeStore();

  const handleDeleteFile = (index: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selection when clicking delete
    
    // Call the deletion handler with proper error handling
    try {
      onDeleteMolecule(index);
      console.log('File deleted successfully at index:', index);
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  // Safe structure selection handler
  const handleStructureSelect = (index: number) => {
    if (index >= 0 && index < loadedStructures.length) {
      setSelectedFileIndex(index);
    }
  };

  return (
    <div className="space-y-6">
      {/* Visualization Controls Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Visualization</h3>
        </div>
        
        <div className="bg-muted/30 rounded-lg p-4 space-y-4">
          <div>
            <h4 className="text-xs font-medium mb-2 text-muted-foreground">View Mode</h4>
            <Select
              value={viewerState.viewMode}
              onValueChange={(value: ViewMode) => onViewModeChange(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select view mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="cartoon">Cartoon</SelectItem>
                <SelectItem value="spacefill">Spacefill</SelectItem>
                <SelectItem value="licorice">Licorice</SelectItem>
                <SelectItem value="surface">Surface</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <h4 className="text-xs font-medium mb-2 text-muted-foreground">Color Scheme</h4>
            <Select
              value={viewerState.colorScheme}
              onValueChange={(value: ColorScheme) => onColorSchemeChange(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select color scheme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DEFAULT">Default</SelectItem>
                <SelectItem value="CHAIN">Chain</SelectItem>
                <SelectItem value="RESIDUE">Residue</SelectItem>
                <SelectItem value="ELEMENT">Element</SelectItem>
                <SelectItem value="BFACTOR">B-Factor</SelectItem>
                <SelectItem value="SEQUENCE">Sequence</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Ligands</label>
              <Button
                variant={viewerState.showLigand ? "default" : "outline"}
                size="sm"
                onClick={() => onLigandVisibilityChange(!viewerState.showLigand)}
                className="min-w-20"
              >
                {viewerState.showLigand ? "Visible" : "Hidden"}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Water/Ions</label>
              <Button
                variant={viewerState.showWaterIon ? "default" : "outline"}
                size="sm"
                onClick={() => onWaterIonVisibilityChange(!viewerState.showWaterIon)}
                className="min-w-20"
              >
                {viewerState.showWaterIon ? "Visible" : "Hidden"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
