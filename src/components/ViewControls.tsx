import React from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";
import { ViewerState, ViewMode } from '@/types/viewer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ViewControlsProps {
  viewerState: ViewerState;
  onAtomSizeChange: (size: number) => void;
  onLigandVisibilityChange: (visible: boolean) => void;
  onWaterIonVisibilityChange: (visible: boolean) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onCenter: () => void;
  onFileUpload: (file: File) => void;
}

export const ViewControls: React.FC<ViewControlsProps> = ({
  viewerState,
  onAtomSizeChange,
  onLigandVisibilityChange,
  onWaterIonVisibilityChange,
  onViewModeChange,
  onCenter,
  onFileUpload,
}) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <div className="flex flex-col space-y-4 p-4 border rounded-lg bg-white dark:bg-gray-900">
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

      <div>
        <Label className="text-sm font-medium mb-2 block">Representation</Label>
        <Select value={viewerState.viewMode} onValueChange={(value) => onViewModeChange(value as ViewMode)}>
          <SelectTrigger>
            <SelectValue placeholder="Select representation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cartoon">Cartoon</SelectItem>
            <SelectItem value="spacefill">Spacefill</SelectItem>
            <SelectItem value="licorice">Licorice</SelectItem>
            <SelectItem value="surface">Surface</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Atom Size</Label>
        <Slider
          value={[viewerState.atomSize]}
          min={0.1}
          max={3}
          step={0.1}
          onValueChange={value => onAtomSizeChange(value[0])}
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
  );
};
