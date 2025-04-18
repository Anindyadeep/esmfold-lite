import React, { useEffect, useRef } from 'react';
import * as NGL from 'ngl';
import { Molecule } from '@/utils/pdbParser';
import { ViewerState } from './index';

interface NGLViewportProps {
  molecule?: Molecule;
  viewerState: ViewerState;
}

// Map our UI view modes to NGL representation types
const viewModeToRepresentation = (mode: string): string => {
  switch (mode) {
    case 'cartoon':
      return 'cartoon';
    case 'ball-stick':
      return 'ball+stick';
    case 'surface':
      return 'surface';
    default:
      return 'cartoon';
  }
};

export function NGLViewport({ molecule, viewerState }: NGLViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);

  // Initialize NGL Stage
  useEffect(() => {
    if (!containerRef.current || stageRef.current) return;

    console.log("Initializing NGL Stage");
    stageRef.current = new NGL.Stage(containerRef.current, {
      backgroundColor: 'black',
      quality: 'high',
    });

    // Setup to load data from rawgit
    NGL.DatasourceRegistry.add(
      "data", new NGL.StaticDatasource("//cdn.rawgit.com/arose/ngl/v2.0.0-dev.32/data/")
    );

    // Handle window resize
    const handleResize = () => {
      stageRef.current?.handleResize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (stageRef.current) {
        stageRef.current.dispose();
        stageRef.current = null;
      }
    };
  }, []);

  // Handle molecule changes
  useEffect(() => {
    const loadMolecule = async () => {
      if (!molecule || !stageRef.current) {
        console.log("No molecule or stage available");
        return;
      }

      console.log("Loading molecule with atoms:", molecule.atoms.length);
      if (molecule.atoms.length === 0) {
        console.warn("Molecule has no atoms!");
        return;
      }

      try {
        // Clear previous structures
        stageRef.current.removeAllComponents();

        // Convert molecule data to PDB format string
        const pdbString = moleculeToPDBString(molecule);
        console.log("Generated PDB string length:", pdbString.length);

        // Load the molecule from the string
        const blob = new Blob([pdbString], { type: 'text/plain' });
        const structure = await stageRef.current.loadFile(blob, { ext: 'pdb' });
        console.log("Structure loaded successfully");

        // Clear all representations
        structure.removeAllRepresentations();

        const representation = viewModeToRepresentation(viewerState.viewMode);
        console.log("Using representation:", representation);

        // Add main representation based on viewMode
        if (representation === 'cartoon') {
          structure.addRepresentation('cartoon', {
            name: "polymer",
            sele: "polymer",
            quality: 'high',
            aspectRatio: 2.0,
            scale: viewerState.atomSize,
            smoothSheet: true,
            colorScheme: "chainindex"
          });
        } else if (representation === 'ball+stick') {
          structure.addRepresentation('ball+stick', {
            name: "polymer",
            sele: "polymer",
            quality: 'high',
            aspectRatio: 1.5,
            scale: viewerState.atomSize,
            bondScale: viewerState.atomSize * 0.3,
            bondSpacing: 1.0
          });
        } else if (representation === 'surface') {
          structure.addRepresentation('surface', {
            name: "polymer",
            sele: "polymer",
            quality: 'high',
            scale: viewerState.atomSize,
            surfaceType: 'vws',
            colorScheme: "chainindex",
            opacity: 0.85
          });
        }

        // Add ligand representation
        structure.addRepresentation("ball+stick", {
          name: "ligand",
          visible: viewerState.showLigand,
          sele: "not ( polymer or water or ion )",
          quality: 'high',
          aspectRatio: 1.5,
          scale: viewerState.atomSize * 1.2,
          bondScale: viewerState.atomSize * 0.5,
          bondSpacing: 1.0
        });

        // Add water and ion representation
        structure.addRepresentation("spacefill", {
          name: "waterIon",
          visible: viewerState.showWaterIon,
          sele: "water or ion",
          scale: viewerState.atomSize * 0.25,
          quality: 'high'
        });

        // Center and zoom the view
        stageRef.current.autoView();
        console.log("Centered view");

        // Enable full screen on double click
        stageRef.current.mouseControls.add('dblclick', () => {
          if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
          } else {
            document.exitFullscreen();
          }
        });

      } catch (error) {
        console.error('Error loading molecule:', error);
      }
    };

    loadMolecule();
  }, [molecule, viewerState]);

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className="w-full h-full rounded-lg overflow-hidden"
        style={{ minHeight: '600px' }}
      />

      {/* Loading/Empty States */}
      {molecule && molecule.atoms.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 text-white">
          <div className="text-center p-4">
            <h3 className="text-xl font-bold mb-2">No atoms found</h3>
            <p>The uploaded file doesn't contain any atomic coordinates.</p>
          </div>
        </div>
      )}
      {!molecule && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 text-white">
          <div className="text-center p-4">
            <h3 className="text-xl font-bold mb-2">Upload a PDB file</h3>
            <p>Use the file uploader to visualize a molecular structure.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to convert molecule object to PDB format
const moleculeToPDBString = (molecule: Molecule): string => {
  let pdbString = '';
  
  molecule.atoms.forEach(atom => {
    // Format according to PDB specification
    // http://www.wwpdb.org/documentation/file-format-content/format33/sect9.html#ATOM
    const record = atom.id > 99999 ? 'HETATM' : 'ATOM  ';
    const atomId = atom.id.toString().padStart(5, ' ');
    const element = atom.element.padEnd(4, ' ');
    const residue = atom.residue.padEnd(3, ' ');
    const chain = atom.chain || 'A';
    const resId = atom.residueId.toString().padStart(4, ' ');
    const x = atom.position[0].toFixed(3).padStart(8, ' ');
    const y = atom.position[1].toFixed(3).padStart(8, ' ');
    const z = atom.position[2].toFixed(3).padStart(8, ' ');
    
    pdbString += `${record}${atomId} ${element} ${residue} ${chain}${resId}    ${x}${y}${z}  1.00  0.00          ${atom.element.substring(0, 2).padEnd(2, ' ')}\n`;
  });
  
  pdbString += 'END\n';
  return pdbString;
}; 