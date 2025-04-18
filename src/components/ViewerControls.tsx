import React from 'react';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { ViewerState } from '@/types/viewer';
import { Upload } from 'lucide-react';

interface ViewerControlsProps {
  viewerState: ViewerState;
  onAtomSizeChange: (size: number) => void;
  onLigandVisibilityChange: (visible: boolean) => void;
  onWaterIonVisibilityChange: (visible: boolean) => void;
  onCenter: () => void;
  onFileUpload: (file: File) => void;
}

export function ViewerControls({
  viewerState,
  onAtomSizeChange,
  onLigandVisibilityChange,
  onWaterIonVisibilityChange,
  onCenter,
  onFileUpload,
}: ViewerControlsProps) {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <div className="absolute top-3 left-3 z-10 flex flex-col gap-3 bg-white dark:bg-gray-800 bg-opacity-90 dark:bg-opacity-90 p-4 rounded-lg shadow-lg">
      <div>
        <input
          type="file"
          id="structure-upload"
          className="hidden"
          accept=".pdb,.cif,.ent,.gz"
          onChange={handleFileChange}
        />
        <Button 
          variant="default"
          onClick={() => document.getElementById('structure-upload')?.click()}
          className="w-full flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Upload Structure
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium mb-2 block">Atom Size</Label>
          <Slider
            value={[viewerState.atomSize]}
            onValueChange={(value) => onAtomSizeChange(value[0])}
            min={0.1}
            max={2}
            step={0.1}
            className="w-full"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="ligand"
            checked={viewerState.showLigand}
            onCheckedChange={(checked) => onLigandVisibilityChange(checked as boolean)}
          />
          <Label htmlFor="ligand">Show Ligand</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="water-ion"
            checked={viewerState.showWaterIon}
            onCheckedChange={(checked) => onWaterIonVisibilityChange(checked as boolean)}
          />
          <Label htmlFor="water-ion">Show Water + Ion</Label>
        </div>

        <Button variant="outline" onClick={onCenter} className="w-full">
          Center View
        </Button>
      </div>
    </div>
  );
} 