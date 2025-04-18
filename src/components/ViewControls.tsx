import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Crosshair } from "lucide-react";
import { ViewerState, ViewMode, ColorScheme } from '@/types/viewer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from '@/components/ui/separator';

interface ViewControlsProps {
  viewerState: ViewerState;
  onViewModeChange: (mode: ViewMode) => void;
  onColorSchemeChange: (scheme: ColorScheme) => void;
  onCenter: () => void;
}

export const ViewControls: React.FC<ViewControlsProps> = ({
  viewerState,
  onViewModeChange,
  onColorSchemeChange,
  onCenter,
}) => {
  return (
    <div className="space-y-6 p-4">
      <div className="space-y-4">
        <Label className="text-sm font-medium">Representation</Label>
        <Select value={viewerState.viewMode} onValueChange={onViewModeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select view mode" />
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
        <Label className="text-sm font-medium">Color Scheme</Label>
        <Select value={viewerState.colorScheme} onValueChange={onColorSchemeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select color scheme" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DEFAULT">Default</SelectItem>
            <SelectItem value="ELEMENT">Element</SelectItem>
            <SelectItem value="RESIDUE">Residue</SelectItem>
            <SelectItem value="CHAIN">Chain</SelectItem>
            <SelectItem value="BFACTOR">B-Factor</SelectItem>
            <SelectItem value="ATOMINDEX">Atom Index</SelectItem>
            <SelectItem value="ELECTROSTATIC">Electrostatic</SelectItem>
            <SelectItem value="CUSTOM">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <Button variant="outline" onClick={onCenter} className="w-full flex items-center gap-2">
        <Crosshair className="w-4 h-4" />
        Center View
      </Button>
    </div>
  );
};

export default ViewControls;
