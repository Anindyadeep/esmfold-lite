import React, { useEffect, useRef, forwardRef } from 'react';
import * as NGL from 'ngl';
import { ViewerState } from '@/types/viewer';

interface NGLViewerProps {
  structures: { id: string; pdbData: string }[];
  viewerState: ViewerState;
}

// Define colors for different structures in DEFAULT mode
const STRUCTURE_COLORS = [
  0x0077BE, // Blue
  0xBE0077, // Pink
  0x77BE00, // Green
  0xBE7700, // Orange
  0x00BEB7, // Teal
  0x7700BE, // Purple
  0xBEB700, // Yellow
  0x00BE77  // Mint
];

// Color scheme definitions
const COLOR_SCHEMES = {
  DEFAULT: 'uniform',
  ELEMENT: 'element',
  RESIDUE: 'resname',
  CHAIN: 'chainindex',
  BFACTOR: 'bfactor',
  ATOMINDEX: 'atomindex',
  ELECTROSTATIC: 'electrostatic'
};

// Get color scheme parameters based on the selected scheme
const getColorSchemeParams = (scheme: string, structureIndex: number = 0) => {
  if (scheme === COLOR_SCHEMES.DEFAULT) {
    return {
      color: STRUCTURE_COLORS[structureIndex % STRUCTURE_COLORS.length]
    };
  }

  switch (scheme) {
    case COLOR_SCHEMES.ELECTROSTATIC:
      return {
        colorScheme: scheme,
        colorDomain: [-0.3, 0.3],
        surfaceType: 'av'
      };
    case COLOR_SCHEMES.BFACTOR:
      return {
        colorScheme: scheme,
        colorScale: 'RdYlBu',
        colorReverse: true
      };
    case COLOR_SCHEMES.ATOMINDEX:
      return {
        colorScheme: scheme,
        colorScale: 'rainbow'
      };
    default:
      return { colorScheme: scheme };
  }
};

export const NGLViewer = forwardRef<any, NGLViewerProps>(({ structures, viewerState }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const loadedStructuresRef = useRef<Map<string, any>>(new Map());

  // Initialize NGL Stage
  useEffect(() => {
    if (!containerRef.current) return;

    console.log('Initializing NGL Stage'); // Debug log

    // Setup to load data from rawgit
    NGL.DatasourceRegistry.add(
      "data", new NGL.StaticDatasource("//cdn.rawgit.com/arose/ngl/v2.0.0-dev.32/data/")
    );

    // Initialize NGL Stage with better quality settings
    stageRef.current = new NGL.Stage(containerRef.current, {
      backgroundColor: 'white',
      quality: 'high',
      impostor: true,
      camera: 'perspective',
      clipNear: 1,
      clipFar: 10000,
      fogNear: 100,
      fogFar: 1000,
      cameraType: 'perspective',
      cameraFov: 40,
    });

    // Handle window resizing
    const handleResize = () => {
      if (stageRef.current) {
        stageRef.current.handleResize();
      }
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

  // Handle structures changes
  useEffect(() => {
    console.log('Structures changed:', structures); // Debug log

    const loadStructures = async () => {
      if (!stageRef.current) {
        console.error('Stage not initialized'); // Debug log
        return;
      }

      try {
        // Remove all existing components and clear the map
        stageRef.current.removeAllComponents();
        loadedStructuresRef.current.clear();

        console.log('Loading structures:', structures.length); // Debug log

        // Load each structure
        for (let i = 0; i < structures.length; i++) {
          const { id, pdbData } = structures[i];
          console.log('Loading structure:', id); // Debug log

          try {
            // Load new structure
            const blob = new Blob([pdbData], { type: 'text/plain' });
            const structure = await stageRef.current.loadFile(blob, { ext: 'pdb' });
            loadedStructuresRef.current.set(id, structure);
            console.log('Structure loaded:', id); // Debug log

            // Add representations
            updateRepresentation(structure, i);
            console.log('Representation updated:', id); // Debug log
          } catch (error) {
            console.error('Error loading individual structure:', id, error);
          }
        }

        // Center view if any structures are loaded
        if (structures.length > 0) {
          console.log('Centering view'); // Debug log
          stageRef.current.autoView(1000);
        }
      } catch (error) {
        console.error('Error loading structures:', error);
      }
    };

    const updateRepresentation = (structure: any, structureIndex: number) => {
      try {
        // Remove existing representations
        structure.removeAllRepresentations();

        // Get color scheme parameters
        const colorParams = getColorSchemeParams(COLOR_SCHEMES[viewerState.colorScheme] || COLOR_SCHEMES.DEFAULT, structureIndex);

        // Add main representation based on viewMode
        switch (viewerState.viewMode) {
          case 'cartoon':
            structure.addRepresentation('cartoon', {
              name: "polymer",
              sele: "polymer",
              quality: 'high',
              aspectRatio: 2.0,
              scale: viewerState.atomSize,
              smoothSheet: true,
              ...colorParams
            });
            break;
          case 'spacefill':
            structure.addRepresentation('spacefill', {
              name: "polymer",
              sele: "polymer",
              quality: 'high',
              scale: viewerState.atomSize,
              ...colorParams
            });
            break;
          case 'licorice':
            structure.addRepresentation('licorice', {
              name: "polymer",
              sele: "polymer",
              quality: 'high',
              scale: viewerState.atomSize,
              ...colorParams
            });
            break;
          case 'surface':
            structure.addRepresentation('surface', {
              name: "polymer",
              sele: "polymer",
              quality: 'high',
              scale: viewerState.atomSize,
              surfaceType: 'vws',
              opacity: 0.85,
              ...colorParams
            });
            break;
        }

        // Add ligand representation if enabled
        if (viewerState.showLigand) {
          structure.addRepresentation("ball+stick", {
            name: "ligand",
            visible: true,
            sele: "not ( polymer or water or ion )",
            quality: 'high',
            aspectRatio: 1.5,
            scale: viewerState.atomSize * 1.2,
            bondScale: viewerState.atomSize * 0.3,
            bondSpacing: 1.0,
            colorScheme: 'element'
          });
        }

        // Add water/ion representation if enabled
        if (viewerState.showWaterIon) {
          structure.addRepresentation("spacefill", {
            name: "waterIon",
            visible: true,
            sele: "water or ion",
            scale: viewerState.atomSize * 0.25,
            quality: 'high',
            colorScheme: 'element'
          });
        }
      } catch (error) {
        console.error('Error updating representation:', error);
      }
    };

    loadStructures();
  }, [structures, viewerState]);

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className="w-full h-full rounded-lg overflow-hidden"
        style={{ minHeight: '600px' }}
      />
    </div>
  );
});
