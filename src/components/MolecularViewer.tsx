import { useEffect, useRef } from 'react';
import * as NGL from 'ngl';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';

export function MolecularViewer() {
  const viewerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);

  useEffect(() => {
    if (!viewerRef.current) return;

    // Setup to load data from rawgit
    NGL.DatasourceRegistry.add(
      "data", new NGL.StaticDatasource("//cdn.rawgit.com/arose/ngl/v2.0.0-dev.32/data/")
    );

    // Create NGL Stage object
    const stage = new NGL.Stage(viewerRef.current);
    stageRef.current = stage;

    // Handle window resizing
    const handleResize = () => {
      stage.handleResize();
    };
    window.addEventListener("resize", handleResize);

    // Load initial structure
    loadStructure("data://3SN6.cif");

    return () => {
      window.removeEventListener("resize", handleResize);
      stage.dispose();
    };
  }, []);

  const loadStructure = async (input: string | File) => {
    if (!stageRef.current) return;
    
    stageRef.current.removeAllComponents();
    try {
      const component = await stageRef.current.loadFile(input);
      component.autoView();
      component.addRepresentation("cartoon", {
        sele: "polymer",
        name: "polymer"
      });
      component.addRepresentation("ball+stick", {
        name: "ligand",
        visible: true,
        sele: "not ( polymer or water or ion )"
      });
      component.addRepresentation("spacefill", {
        name: "waterIon",
        visible: false,
        sele: "water or ion",
        scale: 0.25
      });
    } catch (error) {
      console.error("Error loading structure:", error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      loadStructure(file);
    }
  };

  const handleRepresentationChange = (value: string) => {
    if (!stageRef.current) return;
    
    stageRef.current.getRepresentationsByName("polymer").dispose();
    stageRef.current.eachComponent((o: any) => {
      o.addRepresentation(value, {
        sele: "polymer",
        name: "polymer"
      });
    });
  };

  const handleLigandVisibility = (checked: boolean) => {
    if (!stageRef.current) return;
    stageRef.current.getRepresentationsByName("ligand").setVisibility(checked);
  };

  const handleWaterIonVisibility = (checked: boolean) => {
    if (!stageRef.current) return;
    stageRef.current.getRepresentationsByName("waterIon").setVisibility(checked);
  };

  const handleCenter = () => {
    if (!stageRef.current) return;
    stageRef.current.autoView(1000);
  };

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-3">
        <div>
          <input
            type="file"
            id="structure-upload"
            className="hidden"
            accept=".pdb,.cif,.ent,.gz"
            onChange={handleFileUpload}
          />
          <Button
            variant="secondary"
            onClick={() => document.getElementById('structure-upload')?.click()}
          >
            Load Structure
          </Button>
        </div>

        <Select onValueChange={handleRepresentationChange} defaultValue="cartoon">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select representation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cartoon">Cartoon</SelectItem>
            <SelectItem value="spacefill">Spacefill</SelectItem>
            <SelectItem value="licorice">Licorice</SelectItem>
            <SelectItem value="surface">Surface</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="ligand"
            defaultChecked
            onCheckedChange={handleLigandVisibility}
          />
          <Label htmlFor="ligand">Ligand</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="water-ion"
            onCheckedChange={handleWaterIonVisibility}
          />
          <Label htmlFor="water-ion">Water + Ion</Label>
        </div>

        <Button variant="outline" onClick={handleCenter}>
          Center
        </Button>
      </div>

      <div
        ref={viewerRef}
        className="w-full h-full"
        style={{ position: 'relative' }}
      />
    </div>
  );
} 