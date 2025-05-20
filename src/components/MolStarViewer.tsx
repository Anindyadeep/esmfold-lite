import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context';
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { Plugin } from 'molstar/lib/mol-plugin-ui/plugin';
import { ViewerState } from '@/types/viewer';
import { createRoot } from 'react-dom/client';

interface MolStarViewerProps {
  structures: {
    id: string;
    pdbData: string;
    name?: string;
    source?: 'file' | 'job';
  }[];
  viewerState: ViewerState;
}

const STRUCTURE_COLORS = [
  0x0077BE, 0xBE0077, 0x77BE00, 0xBE7700,
  0x00BEB7, 0x7700BE, 0xBEB700, 0x00BE77,
  0xFF5733, 0x339CFF, 0xCC33FF, 0x33FF57
];

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

  useImperativeHandle(ref, () => ({
    plugin: pluginRef.current,
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

  useEffect(() => {
    if (!containerRef.current) return;

    const initPlugin = async () => {
      try {
        if (pluginRef.current) {
          pluginRef.current.dispose();
          pluginRef.current = null;
          containerRef.current.innerHTML = '';
        }

        const spec = {
          ...DefaultPluginUISpec(),
          layout: {
            initial: {
              isExpanded: false,
              showControls: false,
            },
          },
        };

        const plugin = new PluginUIContext(spec);
        await plugin.init();

        pluginRef.current = plugin;

        const pluginContainer = document.createElement('div');
        containerRef.current.appendChild(pluginContainer);

        createRoot(pluginContainer).render(<Plugin plugin={plugin} />);

        console.log('Mol* plugin with UI initialized');

        if (structures.length > 0) {
          loadStructures();
        }
      } catch (error) {
        console.error('Error initializing Mol* plugin:', error);
      }
    };

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      const wasVisible = isVisibleRef.current;
      isVisibleRef.current = entry.isIntersecting;

      if (entry.isIntersecting && !wasVisible && containerRef.current) {
        const needsReinit = !pluginRef.current || !document.body.contains(containerRef.current);
        if (needsReinit) {
          initPlugin();
        } else {
          setTimeout(() => {
            if (pluginRef.current?.canvas3d) {
              pluginRef.current.canvas3d.handleResize();
              try {
                pluginRef.current.managers.camera.reset();
              } catch (error) {
                console.error('Camera error:', error);
              }
            }
          }, 50);
        }
      }
    }, { threshold: 0.1 });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    initPlugin();

    return () => {
      if (containerRef.current) observer.unobserve(containerRef.current);
      if (pluginRef.current) {
        pluginRef.current.dispose();
        pluginRef.current = null;
      }
    };
  }, [ref]);

  useEffect(() => {
    structuresRef.current = structures;

    if (isVisibleRef.current && pluginRef.current) {
      if (structures.length === 0) {
        pluginRef.current.clear();
      } else {
        loadStructures();
      }
    }
  }, [structures]);

  useEffect(() => {
    if (isVisibleRef.current && pluginRef.current) {
      loadStructures();
    }
  }, [viewerState.viewMode, viewerState.colorScheme, viewerState.showLigand, viewerState.showWaterIon]);

  const loadStructures = async () => {
    if (!pluginRef.current || structures.length === 0) return;

    const plugin = pluginRef.current;

    try {
      await plugin.clear();

      for (let i = 0; i < structures.length; i++) {
        const { id, pdbData } = structures[i];
        const fileExt = id.toLowerCase().split('.').pop() || 'pdb';
        const format = fileExt === 'cif' ? 'mmcif' : 'pdb';
        const blob = new Blob([pdbData], { type: 'text/plain' });
        const blobUrl = URL.createObjectURL(blob);

        try {
          const data = await plugin.builders.data.download({ url: blobUrl, isBinary: false });
          const trajectory = await plugin.builders.structure.parseTrajectory(data, format);

          const colorNum = STRUCTURE_COLORS[i % STRUCTURE_COLORS.length];
          const color = `#${colorNum.toString(16).padStart(6, '0')}`;
          const preset = 'default';

          const reprParams: any = {
            showWater: viewerState.showWaterIon,
            showLigand: viewerState.showLigand,
            ligandStyle: { name: 'ball-and-stick', params: { alpha: 1.0 } },
            waterStyle: { name: 'ball-and-stick', params: { alpha: 0.6 } }
          };

          switch (viewerState.viewMode) {
            case 'cartoon':
            case 'default':
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

          const colorScheme = COLOR_SCHEMES[viewerState.colorScheme] || COLOR_SCHEMES.DEFAULT;

          if (colorScheme === 'uniform' && viewerState.colorScheme === 'DEFAULT') {
            reprParams.colorTheme = {
              name: 'uniform',
              params: { value: color }
            };
          } else {
            reprParams.colorTheme = { name: colorScheme };
          }

          await plugin.builders.structure.hierarchy.applyPreset(trajectory, preset as any, {
            representationPresetParams: reprParams
          });

          URL.revokeObjectURL(blobUrl);
        } catch (e) {
          console.error(`Failed to load structure ${id}`, e);
          URL.revokeObjectURL(blobUrl);
        }
      }

      plugin.managers.camera.reset();
    } catch (e) {
      console.error('Error processing structures:', e);
    }
  };

  return <div ref={containerRef} />;
});