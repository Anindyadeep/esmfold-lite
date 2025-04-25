import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context';
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { PluginConfig } from 'molstar/lib/mol-plugin/config';
import { ViewerState } from '@/types/viewer';
import { ColorNames } from 'molstar/lib/mol-util/color/names';
import './molstar.css';

// Define the props interface
interface MolStarViewerProps {
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

// Define color schemes mapping
const COLOR_SCHEMES = {
  DEFAULT: 'uniform',
  CHAIN: 'chain-id',
  RESIDUE: 'residue-name',
  ELEMENT: 'element-symbol',
  BFACTOR: 'b-factor',
  SEQUENCE: 'sequence-id'
};

export const MolStarViewer = forwardRef<any, MolStarViewerProps>(({ structures, viewerState }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pluginRef = useRef<PluginUIContext | null>(null);
  const structuresRef = useRef(structures);
  const isVisibleRef = useRef(true);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    // Expose the entire plugin
    plugin: pluginRef.current,
    
    // Add a specific method to reset the view
    resetView: () => {
      if (pluginRef.current) {
        try {
          pluginRef.current.managers.camera.reset();
          return true;
        } catch (error) {
          console.error('Error resetting view:', error);
          return false;
        }
      }
      return false;
    }
  }));

  // Initialize Mol* Plugin
  useEffect(() => {
    if (!containerRef.current) return;

    const initPlugin = async () => {
      try {
        // If plugin already exists, dispose it first to prevent memory leaks
        if (pluginRef.current) {
          pluginRef.current.dispose();
          pluginRef.current = null;
          
          // Clear the container
          if (containerRef.current) {
            containerRef.current.innerHTML = '';
          }
        }
        
        // Create a properly configured spec
        const spec = {
          ...DefaultPluginUISpec()
        };
        
        // Make sure layout exists before accessing its properties
        if (!spec.layout) {
          spec.layout = {
            initial: {
              isExpanded: false,
              showControls: true
            }
          };
        } else if (!spec.layout.initial) {
          spec.layout.initial = {
            isExpanded: false,
            showControls: true
          };
        } else {
          spec.layout.initial.isExpanded = false;
          spec.layout.initial.showControls = true;
        }
        
        // Configure viewport options
        if (!spec.config) {
          spec.config = [];
        }
        
        spec.config.push([PluginConfig.Viewport.ShowExpand, false]);
        spec.config.push([PluginConfig.Viewport.ShowControls, true]);
        spec.config.push([PluginConfig.Viewport.ShowSettings, false]);
        spec.config.push([PluginConfig.Viewport.ShowSelectionMode, false]);
        spec.config.push([PluginConfig.Viewport.ShowAnimation, false]);
        
        // Create the plugin instance
        const plugin = new PluginUIContext(spec);
        await plugin.init();
        
        // Store the plugin reference
        pluginRef.current = plugin;
        
        // Create a canvas for the 3D view
        const canvas = document.createElement('canvas');
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        containerRef.current.appendChild(canvas);
        
        // Initialize the viewer with the canvas
        plugin.initViewer(canvas, containerRef.current);
        
        console.log('Mol* plugin initialized');

        // Expose the plugin via ref for external control
        if (ref) {
          if (typeof ref === 'function') {
            ref(plugin);
          } else {
            ref.current = plugin;
          }
        }
        
        // Load structures
        if (structures.length > 0) {
          loadStructures();
        }
      } catch (error) {
        console.error('Error initializing Mol* plugin:', error);
      }
    };

    // Set up visibility observer to detect tab switching
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      const wasVisible = isVisibleRef.current;
      isVisibleRef.current = entry.isIntersecting;
      
      // If the component becomes visible again after being hidden, we need to handle reinit
      if (entry.isIntersecting && !wasVisible && containerRef.current) {
        console.log('Viewer became visible, checking plugin status');
        
        // Check if plugin needs to be reinitialized
        const needsReinit = !pluginRef.current || !document.body.contains(containerRef.current);
        
        if (needsReinit) {
          console.log('Plugin needs to be reinitialized');
          initPlugin();
        } else {
          console.log('Plugin appears valid, triggering resize');
          // Just trigger a resize to ensure proper rendering
          setTimeout(() => {
            if (pluginRef.current && pluginRef.current.canvas3d) {
              pluginRef.current.canvas3d.handleResize();
              // Also reset camera to ensure view is correct
              try {
                pluginRef.current.managers.camera.reset();
              } catch (error) {
                console.error('Error focusing camera after visibility change:', error);
              }
            }
          }, 50);
        }
      }
    }, { threshold: 0.1 });
    
    // Start observing the container
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    // Initial initialization
    initPlugin();

    return () => {
      // Stop observing
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
      
      // Clean up
      if (pluginRef.current) {
        pluginRef.current.dispose();
        pluginRef.current = null;
      }
    };
  }, [ref]);

  // Track structure changes
  useEffect(() => {
    console.log(`Structure array changed: ${structures.length} structures`);
    if (structures.length > 0) {
      console.log('Structure IDs:', structures.map(s => s.id));
    }
    
    structuresRef.current = structures;
    
    // Only load structures if the component is visible
    if (isVisibleRef.current && pluginRef.current) {
      // Special case: if the structures array is now empty, we need to clear the viewer
      if (structures.length === 0) {
        console.log('No structures left, clearing viewer');
        pluginRef.current.clear();
        return;
      }
      
      // Otherwise, load the structures normally
      console.log('Loading structures into viewer');
      loadStructures();
    } else {
      console.log('Component not visible or plugin not initialized, skipping load');
    }
  }, [structures]);

  // Load structures when they change
  const loadStructures = async () => {
    if (!pluginRef.current || structures.length === 0) return;
    
    const plugin = pluginRef.current;
    
    try {
      // Clear any existing structures
      console.log('Clearing existing structures before loading new ones');
      await plugin.clear();
      
      // Log which structures we're loading
      console.log(`Loading ${structures.length} structures:`, structures.map(s => s.id));
      
      // Load each structure
      for (let i = 0; i < structures.length; i++) {
        const { id, pdbData, name } = structures[i];
        
        try {
          // Create a blob and determine format
          const fileExt = id.toLowerCase().split('.').pop() || 'pdb';
          const format = fileExt === 'cif' ? 'mmcif' : 'pdb';
          
          const blob = new Blob([pdbData], { type: 'text/plain' });
          const blobUrl = URL.createObjectURL(blob);
          
          // Load the data
          const data = await plugin.builders.data.download({ url: blobUrl, isBinary: false });
          const trajectory = await plugin.builders.structure.parseTrajectory(data, format);
          
          // Get the appropriate color for this structure if using DEFAULT color scheme
          const colorNum = STRUCTURE_COLORS[i % STRUCTURE_COLORS.length];
          // Convert to hex color string
          const color = `#${colorNum.toString(16).padStart(6, '0')}`;
          
          // Apply representation based on view mode
          const preset = 'default';
          
          // Configure representation parameters
          const reprParams: any = {
            showWater: viewerState.showWaterIon,
            showLigand: viewerState.showLigand,
            ligandStyle: { name: 'ball-and-stick', params: { alpha: 1.0 } },
            waterStyle: { name: 'ball-and-stick', params: { alpha: 0.6 } }
          };
          
          // Set protein/nucleic representation based on viewerState
          switch (viewerState.viewMode) {
            case 'default':
            case 'cartoon':
              reprParams.proteinStyle = { name: 'cartoon', params: { alpha: 1.0 } };
              reprParams.nucleicStyle = { name: 'cartoon', params: { alpha: 1.0 } };
              break;
            case 'spacefill':
              reprParams.proteinStyle = { name: 'spacefill', params: { alpha: 1.0 } };
              reprParams.nucleicStyle = { name: 'spacefill', params: { alpha: 1.0 } };
              break;
            case 'licorice':
              reprParams.proteinStyle = { name: 'ball-and-stick', params: { alpha: 1.0 } };
              reprParams.nucleicStyle = { name: 'ball-and-stick', params: { alpha: 1.0 } };
              break;
            case 'surface':
              reprParams.proteinStyle = { name: 'molecular-surface', params: { alpha: 0.85 } };
              reprParams.nucleicStyle = { name: 'molecular-surface', params: { alpha: 0.85 } };
              break;
          }
          
          // Handle color scheme
          const colorScheme = COLOR_SCHEMES[viewerState.colorScheme] || COLOR_SCHEMES.DEFAULT;
          
          if (colorScheme === 'uniform' && viewerState.colorScheme === 'DEFAULT') {
            // For DEFAULT color scheme, use uniform color based on structure index
            reprParams.colorTheme = { 
              name: 'uniform', 
              params: { 
                value: color 
              } 
            };
          } else {
            // For other color schemes, use the appropriate color theme
            reprParams.colorTheme = { name: colorScheme };
          }
          
          // Apply the preset with representation parameters
          await plugin.builders.structure.hierarchy.applyPreset(trajectory, preset as any, {
            representationPresetParams: reprParams
          });
          
          // Release the blob URL
          URL.revokeObjectURL(blobUrl);
          
          console.log(`Loaded structure: ${id} with preset ${preset} and color scheme ${colorScheme}`);
        } catch (error) {
          console.error('Error loading structure:', id, error);
        }
      }
      
      // Auto-focus the view
      plugin.managers.camera.reset();
      
    } catch (error) {
      console.error('Error processing structures:', error);
    }
  };
  
  // Handle viewMode and colorScheme changes
  useEffect(() => {
    if (isVisibleRef.current && pluginRef.current) {
      loadStructures();
    }
  }, [viewerState.viewMode, viewerState.colorScheme, viewerState.showLigand, viewerState.showWaterIon]);

  // Handle atom size changes
  useEffect(() => {
    if (!pluginRef.current || !isVisibleRef.current) return;
    
    try {
      // The best approach is to reload with new size parameter
      loadStructures();
    } catch (error) {
      console.error('Error handling atom size change:', error);
    }
  }, [viewerState.atomSize]);

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full rounded-lg overflow-hidden"
      />
    </div>
  );
}); 