import React, { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { Molecule } from '@/utils/pdbParser';

interface DistogramProps {
  molecule?: Molecule;
}

export function Distogram({ molecule }: DistogramProps) {
  const plotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!plotRef.current) return;

    // Generate dummy data that mimics protein contact patterns
    const size = 200;
    const distances: number[][] = Array(size).fill(0).map(() => Array(size).fill(0));
    
    // Fill with realistic-looking protein contact patterns
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        // Diagonal contacts (main chain)
        const diagDist = Math.abs(i - j);
        if (diagDist === 0) {
          distances[i][j] = 0; // Self-contact
        } else if (diagDist <= 4) {
          distances[i][j] = 3.8; // Alpha helix contacts
        } else {
          // Add some beta sheet-like patterns
          const betaPattern = (Math.floor(i / 20) + Math.floor(j / 20)) % 2 === 0;
          const betaDist = betaPattern ? 6 + Math.random() * 2 : 15 + Math.random() * 5;
          
          // Add some noise and patterns
          const noise = Math.random() * 5;
          const pattern = Math.sin(i * 0.1) * Math.cos(j * 0.1) * 5;
          
          distances[i][j] = Math.min(20, betaDist + noise + pattern);
        }
      }
    }

    // Add some secondary structure patterns
    for (let i = 0; i < size; i += 40) {
      for (let j = 0; j < 20; j++) {
        if (i + j < size && i + j + 20 < size) {
          distances[i + j][i + j + 20] = 5;
          distances[i + j + 20][i + j] = 5;
        }
      }
    }

    const residueIds = Array.from({ length: size }, (_, i) => i + 1);

    // Create the heatmap data
    const data = [{
      z: distances,
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
      width: plotRef.current.offsetWidth,
      height: plotRef.current.offsetWidth, // Make it square
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

    Plotly.newPlot(plotRef.current, data, layout, config);

    // Cleanup
    return () => {
      if (plotRef.current) {
        Plotly.purge(plotRef.current);
      }
    };
  }, [molecule]);

  return (
    <div 
      ref={plotRef} 
      className="w-full"
      style={{ minHeight: '500px' }}
    />
  );
} 