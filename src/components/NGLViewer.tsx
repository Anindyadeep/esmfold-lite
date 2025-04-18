import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as NGL from 'ngl';
import { ViewerState } from '@/types/viewer';

interface NGLViewerProps {
  structures: { id: string; pdbData: string }[];  // Changed to accept multiple structures
  viewerState: ViewerState;
}

// Custom color scheme based on B-factor
const createBFactorColorScheme = () => {
  return NGL.ColormakerRegistry.addScheme(function (params) {
    this.atomColor = function (atom) {
      if (atom.bfactor > 90) {
        return 0x106DFF; // blue
      } else if (atom.bfactor > 70) {
        return 0x10CFF1; // light blue
      } else if (atom.bfactor > 50) {
        return 0xF6ED12; // yellow
      } else {
        return 0xEF821E; // orange
      }
    };
  });
};

// Define some colors for different structures
const structureColors = [
  [0x0077BE, 0x00A0E3, 0x00C5FF], // Blue shades
  [0xBE0077, 0xE300A0, 0xFF00C5], // Pink shades
  [0x77BE00, 0xA0E300, 0xC5FF00], // Green shades
  [0xBE7700, 0xE3A000, 0xFFC500], // Orange shades
];

export const NGLViewer = forwardRef<any, NGLViewerProps>(({ structures, viewerState }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const bFactorSchemeId = useRef<string>();
  const loadedStructuresRef = useRef<Map<string, any>>(new Map());

  // Forward the stage ref
  useImperativeHandle(ref, () => stageRef.current);

  useEffect(() => {
    if (!containerRef.current) return;

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
      clipNear: 0,
      clipFar: 100,
      fogNear: 50,
      fogFar: 100,
    });

    // Register custom color scheme
    bFactorSchemeId.current = createBFactorColorScheme();

    // Handle window resizing
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

  // Handle structures changes
  useEffect(() => {
    const loadStructures = async () => {
      if (!stageRef.current) return;

      try {
        // Remove structures that are no longer in the list
        const currentIds = new Set(structures.map(s => s.id));
        for (const [id, component] of loadedStructuresRef.current.entries()) {
          if (!currentIds.has(id)) {
            component.dispose();
            loadedStructuresRef.current.delete(id);
          }
        }

        // Load or update each structure
        for (let i = 0; i < structures.length; i++) {
          const { id, pdbData } = structures[i];
          const colorSet = structureColors[i % structureColors.length];

          // Skip if structure already loaded
          if (loadedStructuresRef.current.has(id)) {
            const component = loadedStructuresRef.current.get(id);
            updateRepresentation(component, i);
            continue;
          }

          // Load new structure
          const blob = new Blob([pdbData], { type: 'text/plain' });
          const structure = await stageRef.current.loadFile(blob, { ext: 'pdb' });
          loadedStructuresRef.current.set(id, structure);

          // Add representations
          updateRepresentation(structure, i);
        }

        // Center view if any structures are loaded
        if (structures.length > 0) {
          stageRef.current.autoView(1000);
        }
      } catch (error) {
        console.error('Error loading structures:', error);
      }
    };

    const updateRepresentation = (structure: any, index: number) => {
      // Remove existing representations
      structure.removeAllRepresentations();

      const colorSet = structureColors[index % structureColors.length];
      const mainColor = colorSet[0];

      // Add main representation based on viewMode
      switch (viewerState.viewMode) {
        case 'cartoon':
          structure.addRepresentation('cartoon', {
            sele: 'polymer',
            aspectRatio: 2.0,
            scale: 0.7,
            smoothSheet: true,
            color: mainColor,
          });
          break;
        case 'spacefill':
          structure.addRepresentation('spacefill', {
            sele: 'polymer',
            scale: viewerState.atomSize,
            color: mainColor,
          });
          break;
        case 'licorice':
          structure.addRepresentation('licorice', {
            sele: 'polymer',
            scale: viewerState.atomSize,
            color: mainColor,
          });
          break;
        case 'surface':
          structure.addRepresentation('surface', {
            sele: 'polymer',
            opacity: 0.7,
            color: mainColor,
          });
          break;
      }

      // Add ligand representation if enabled
      if (viewerState.showLigand) {
        structure.addRepresentation('ball+stick', {
          sele: 'not (polymer or water or ion)',
          scale: viewerState.atomSize,
          aspectRatio: 1.5,
          bondScale: viewerState.atomSize * 0.3,
          bondSpacing: 1.0,
          color: colorSet[1],
        });
      }

      // Add water/ion representation if enabled
      if (viewerState.showWaterIon) {
        structure.addRepresentation('ball+stick', {
          sele: 'water or ion',
          scale: viewerState.atomSize * 0.5,
          color: colorSet[2],
        });
      }
    };

    loadStructures();
  }, [structures, viewerState]);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full rounded-lg overflow-hidden"
      style={{ minHeight: '600px' }}
    />
  );
});
