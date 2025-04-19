import React, { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { Molecule } from '@/utils/pdbParser';
import { calculateDistogram } from '@/utils/distogram';

interface DistogramProps {
  molecule?: Molecule;
  data?: number[][];
  width?: number;
  height?: number;
}

export function Distogram({ molecule, data, width = 500, height = 500 }: DistogramProps) {
  const plotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!plotRef.current) return;
    
    let distogramData: number[][] = [];
    
    // Use provided data or calculate from molecule
    if (data) {
      distogramData = data;
    } else if (molecule) {
      distogramData = calculateDistogram(molecule);
    } else {
      // If neither data nor molecule is provided, return early
      return;
    }
    
    // Generate residue IDs for the axes
    const residueIds = Array.from({ length: distogramData.length }, (_, i) => i + 1);

    // Create the heatmap data
    const plotData = [{
      z: distogramData,
      x: residueIds,
      y: residueIds,
      type: 'heatmap',
      colorscale: [
        [0, '#00008B'],    // Dark blue for close contacts
        [0.2, '#4B0082'],  // Indigo
        [0.4, '#800080'],  // Purple
        [0.6, '#9400D3'],  // Dark violet
        [0.8, '#9932CC'],  // Dark orchid
        [1, '#E6E6FA']     // Light purple/white for distant regions
      ],
      colorbar: {
        title: 'Distance (Å)',
        titleside: 'right',
        tickfont: { size: 10 },
        titlefont: { size: 12 }
      },
      hoverongaps: false,
      showscale: true
    }];

    const layout = {
      title: {
        text: 'Residue Distance Matrix',
        font: { size: 16 }
      },
      xaxis: {
        title: 'Residue Number',
        scaleanchor: 'y',
        showgrid: false,
        tickfont: { size: 10 }
      },
      yaxis: {
        title: 'Residue Number',
        showgrid: false,
        tickfont: { size: 10 }
      },
      width: width,
      height: height,
      margin: {
        l: 60,
        r: 50,
        b: 60,
        t: 40,
      },
      plot_bgcolor: '#FFFFFF',
      paper_bgcolor: '#FFFFFF'
    };

    const config = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['lasso2d', 'select2d']
    };

    Plotly.newPlot(plotRef.current, plotData, layout, config);

    // Cleanup
    return () => {
      if (plotRef.current) {
        Plotly.purge(plotRef.current);
      }
    };
  }, [molecule, data, width, height]);

  return (
    <div 
      ref={plotRef} 
      className="w-full"
      style={{ minHeight: '400px' }}
    />
  );
} 