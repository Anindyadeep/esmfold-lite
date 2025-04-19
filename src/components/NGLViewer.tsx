import React, { useEffect, useRef, forwardRef } from 'react';
import * as NGL from 'ngl';
import { ViewerState } from '@/types/viewer';

interface NGLViewerProps {
  structures: { 
    id: string; 
    pdbData: string;
    name?: string;
    source?: 'file' | 'job';
  }[];
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
  0x00BE77, // Mint
  0xFF5733, // Coral
  0x339CFF, // Sky Blue
  0xCC33FF, // Lavender
  0x33FF57  // Lime
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
    // Always use a unique color for each structure based on index
    const colorIndex = structureIndex % STRUCTURE_COLORS.length;
    const color = STRUCTURE_COLORS[colorIndex];
    console.log(`Assigned color ${color.toString(16)} to structure index ${structureIndex}`);
    return {
      color: color
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

    // Initialize NGL Stage with better quality settings - removed invalid 'camera' property
    stageRef.current = new NGL.Stage(containerRef.current, {
      backgroundColor: 'white',
      quality: 'high',
      impostor: true,
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

  // Handle structures changes - improved to handle individual structure changes
  useEffect(() => {
    if (!stageRef.current) {
      console.error('Stage not initialized');
      return;
    }

    // Log detailed structure information for debugging
    console.log('Structures changed:', structures.length, 
      structures.map(s => ({ id: s.id, name: s.name || s.id, source: s.source || 'unknown' })));

    // Track current structures and previously loaded ones
    const currentStructureIds = new Set(structures.map(s => s.id));
    const previousStructureIds = new Set(loadedStructuresRef.current.keys());
    
    const processStructures = async () => {
      try {
        // 1. Remove structures that are no longer in the list
        for (const id of previousStructureIds) {
          if (!currentStructureIds.has(id)) {
            console.log('Removing structure:', id);
            const component = loadedStructuresRef.current.get(id);
            if (component) {
              stageRef.current.removeComponent(component);
              loadedStructuresRef.current.delete(id);
            }
          }
        }
        
        // 2. Load new structures and update existing ones
        for (let i = 0; i < structures.length; i++) {
          const structure = structures[i];
          const { id, pdbData } = structure;
          const source = structure.source || 'unknown';
          
          // Check if the structure is already loaded
          if (loadedStructuresRef.current.has(id)) {
            // Just update the representation
            const component = loadedStructuresRef.current.get(id);
            if (component) {
              // Set structureIndex to ensure each structure gets a unique color
              updateRepresentation(component, i);
              console.log(`Updated representation for existing structure: ${id} (index: ${i})`);
            }
          } else {
            // Load new structure
            console.log(`Loading new structure: ${id} (index: ${i}, source: ${source})`);
            try {
              // Determine file extension
              const fileExt = id.toLowerCase().split('.').pop() || 'pdb';
              const ext = fileExt === 'cif' ? 'cif' : 'pdb';
              
              // Create a blob and load it
              const blob = new Blob([pdbData], { type: 'text/plain' });
              const component = await stageRef.current.loadFile(blob, { ext });
              
              // Store reference and add representations
              loadedStructuresRef.current.set(id, component);
              updateRepresentation(component, i);
              console.log(`Loaded new structure: ${id} with index ${i}`);
            } catch (error) {
              console.error('Error loading structure:', id, error);
            }
          }
        }
        
        // 3. Auto-view all structures if we have any
        if (loadedStructuresRef.current.size > 0) {
          stageRef.current.autoView(1000);
          console.log('Auto-centered view on', loadedStructuresRef.current.size, 'structures');
        }
      } catch (error) {
        console.error('Error processing structures:', error);
      }
    };
    
    processStructures();
  }, [structures, viewerState]);
  
  const updateRepresentation = (structure: any, structureIndex: number) => {
    try {
      // Remove existing representations
      structure.removeAllRepresentations();

      // Get color scheme parameters
      const colorParams = getColorSchemeParams(COLOR_SCHEMES[viewerState.colorScheme] || COLOR_SCHEMES.DEFAULT, structureIndex);

      // Log the structure and color assignment for debugging
      console.log(`Applying representation to structure index ${structureIndex} with color scheme:`, viewerState.colorScheme, colorParams);

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

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full rounded-lg overflow-hidden"
      />
    </div>
  );
});
