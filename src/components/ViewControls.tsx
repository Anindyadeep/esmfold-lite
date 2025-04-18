import React from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Crosshair } from "lucide-react";
import { ViewerState, ViewMode } from '@/types/viewer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from '@/components/ui/separator';

interface ViewControlsProps {
  viewerState: ViewerState;
  onAtomSizeChange: (size: number) => void;
  onLigandVisibilityChange: (visible: boolean) => void;
  onWaterIonVisibilityChange: (visible: boolean) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onCenter: () => void;
}

export const ViewControls: React.FC<ViewControlsProps> = ({
  viewerState,
  onAtomSizeChange,
  onLigandVisibilityChange,
  onWaterIonVisibilityChange,
  onViewModeChange,
  onCenter,
}) => {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Representation</Label>
          <Button variant="outline" size="icon" onClick={onCenter}>
            <Crosshair className="h-4 w-4" />
            <span className="sr-only">Center view</span>
          </Button>
        </div>
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

      <Separator />

      <div className="space-y-4">
        <Label className="text-sm font-medium">Atom Size</Label>
        <Slider
          value={[viewerState.atomSize]}
          min={0.1}
          max={3}
          step={0.1}
          onValueChange={value => onAtomSizeChange(value[0])}
          className="py-2"
        />
      </div>

      <Separator />

      <div className="space-y-4">
        <Label className="text-sm font-medium">Visibility</Label>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="show-ligand" className="text-sm">
              Show Ligand
            </Label>
            <Switch
              id="show-ligand"
              checked={viewerState.showLigand}
              onCheckedChange={onLigandVisibilityChange}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="show-water-ion" className="text-sm">
              Show Water + Ion
            </Label>
            <Switch
              id="show-water-ion"
              checked={viewerState.showWaterIon}
              onCheckedChange={onWaterIonVisibilityChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewControls;
