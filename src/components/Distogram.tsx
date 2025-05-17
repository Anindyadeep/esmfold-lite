import React, { useEffect, useRef, useState } from 'react';
import Plotly from 'plotly.js-dist-min';
import { Molecule } from '@/utils/pdbParser';
import { calculateDistogram } from '@/utils/distogram';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { Info } from 'lucide-react';

interface DistogramData {
  distance_matrix: number[][];
  bin_edges: number[];
  max_distance: number;
  num_bins: number;
}

interface DistogramProps {
  molecule?: Molecule;
  data?: number[][] | number[] | DistogramData | any; // Accept various formats including the new backend format
  width?: number;
  height?: number;
  source?: 'file' | 'job'; // Added to know the source of the data
}

// Help text explaining how to interpret distance matrices
const distogramHelpText = `
Distance Matrix Explanation:

A distance matrix (or distogram) shows pairwise distances between amino acid residues in a protein structure.

- X and Y axes represent residue numbers in sequence
- Dark blue/purple colors indicate residues that are close in 3D space (0-5Å)
- Light purple/white colors indicate residues that are distant from each other

Features to observe:
• Diagonal line: Always dark blue (each residue is 0Å from itself)
• Secondary structures:
  - Alpha helices: Dark bands parallel to diagonal (~5-7 residues wide)
  - Beta sheets: Dark bands perpendicular to diagonal
• Domains: Appear as dark square regions along diagonal
• Folding patterns: Tertiary contacts appear as dark spots away from diagonal

Distance matrix provides a fingerprint of the protein's structural organization.
`;

export function Distogram({ molecule, data, width = 500, height = 500, source = 'file' }: DistogramProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!plotRef.current) return;
    
    try {
      let distogramData: number[][] = [];
      
      // Use provided data or calculate from molecule
      if (data) {
        console.log('Received distogram data:', {
          type: typeof data,
          isArray: Array.isArray(data),
          length: data ? data.length : 0,
          sampleValue: data && data.length > 0 ? data[0] : null,
          isFirstItemArray: data && data.length > 0 ? Array.isArray(data[0]) : false,
          isObject: typeof data === 'object' && !Array.isArray(data),
          hasDistanceMatrix: typeof data === 'object' && !Array.isArray(data) && 'distance_matrix' in data,
          source: source,
          constructor: data ? data.constructor.name : 'null'
        });
        
        // Handle string data (possibly JSON)
        if (typeof data === 'string') {
          try {
            const parsedData = JSON.parse(data);
            console.log('Parsed string data:', {
              isArray: Array.isArray(parsedData),
              length: parsedData.length
            });
            data = parsedData;
          } catch (e) {
            console.error('Failed to parse string data as JSON:', e);
            throw new Error('Invalid distogram data: string cannot be parsed as JSON');
          }
        }
        
        // Check if data is null, undefined, or empty
        if (!data || (Array.isArray(data) && data.length === 0)) {
          throw new Error('Distogram data is empty or null');
        }
        
        // Handle the new backend format with distance_matrix
        if (typeof data === 'object' && !Array.isArray(data) && 'distance_matrix' in data) {
          console.log('Detected new backend distogram format with distance_matrix property');
          const distogramObject = data as DistogramData;
          if (Array.isArray(distogramObject.distance_matrix)) {
            distogramData = distogramObject.distance_matrix;
            console.log(`Using distance_matrix from backend format: ${distogramData.length}x${distogramData[0]?.length} matrix`);
          } else {
            throw new Error('Invalid distogram data: distance_matrix is not an array');
          }
        }
        // Check if data is a 1D array (flat list from API) or 2D array
        else if (Array.isArray(data)) {
          if (Array.isArray(data[0])) {
            // Data is already in 2D array format
            console.log('Distogram is already in 2D array format');
            distogramData = data as number[][];
          } else {
            // Data is a flat list, need to convert to 2D array
            console.log('Distogram is in flat list format, converting to 2D array');
            const flatData = data as number[];
            // Determine matrix size (assuming square matrix)
            const matrixSize = Math.sqrt(flatData.length);
            
            if (Number.isInteger(matrixSize)) {
              console.log(`Converting flat list of length ${flatData.length} to ${matrixSize}x${matrixSize} matrix`);
              // Convert flat list to 2D array
              distogramData = Array(matrixSize).fill(0).map((_, i) => 
                flatData.slice(i * matrixSize, (i + 1) * matrixSize)
              );
              console.log('Conversion complete. First row:', distogramData[0]);
            } else {
              console.error('Invalid distogram data format: list length is not a perfect square', {
                length: flatData.length,
                squareRoot: matrixSize
              });
              throw new Error(`Invalid distogram data: list length (${flatData.length}) is not a perfect square`);
            }
          }
        } else {
          throw new Error(`Distogram data is not in a recognized format: ${typeof data}`);
        }
      } else if (molecule) {
        console.log('No distogram data provided, calculating from molecule');
        distogramData = calculateDistogram(molecule);
      } else {
        // If neither data nor molecule is provided, return early
        throw new Error('No distogram data or molecule provided');
      }
      
      // Safety check - ensure we have a valid 2D array
      if (!distogramData || !Array.isArray(distogramData) || distogramData.length === 0) {
        throw new Error('Failed to create valid distogram data');
      }
      
      console.log(`Final distogram matrix size: ${distogramData.length}x${distogramData[0]?.length}`);
      
      // Analyze the distance distribution to determine color scale range
      let minDist = Infinity;
      let maxDist = 0;
      let sumDist = 0;
      let countValues = 0;
      
      for (const row of distogramData) {
        for (const dist of row) {
          if (dist !== null && dist !== undefined && !isNaN(dist)) {
            minDist = Math.min(minDist, dist);
            maxDist = Math.max(maxDist, dist);
            sumDist += dist;
            countValues++;
          }
        }
      }
      
      const avgDist = countValues > 0 ? sumDist / countValues : 0;
      
      // If data includes max_distance (from backend), use it for color scaling
      let configuredMaxDistance = 20; // Default
      
      // Check if the original data is the full distogram object with max_distance
      if (typeof data === 'object' && !Array.isArray(data) && 'max_distance' in data) {
        configuredMaxDistance = data.max_distance;
        console.log(`Using configured max_distance from data: ${configuredMaxDistance}`);
      }
      
      // Normalize the color scale based on data source and distribution
      // For job data (from backend), which typically has a wider range of values
      let colorScaleMax = source === 'job' ? Math.min(maxDist, configuredMaxDistance) : maxDist;
      
      // If the average distance is very high, likely from a backend prediction model,
      // adjust the color scale to improve contrast
      if (avgDist > 10 && source === 'job') {
        colorScaleMax = Math.min(avgDist * 1.5, configuredMaxDistance); // Cap at configured max for better visualization
      }
      
      console.log('Distance distribution:', {
        min: minDist,
        max: maxDist,
        avg: avgDist,
        configuredMax: configuredMaxDistance,
        colorScaleMax: colorScaleMax
      });
      
      // Generate residue IDs for the axes
      const residueIds = Array.from({ length: distogramData.length }, (_, i) => i + 1);
  
      // Create the heatmap data with fixed zmax for better contrast
      const plotData = [{
        z: distogramData,
        x: residueIds,
        y: residueIds,
        type: 'heatmap',
        colorscale: [
          [0, '#000080'],    // Navy blue for closest contacts (0 Å)
          [0.15, '#0000FF'], // Blue
          [0.3, '#4B0082'],  // Indigo
          [0.45, '#800080'], // Purple
          [0.6, '#9400D3'],  // Dark violet
          [0.75, '#BA55D3'], // Medium orchid
          [0.9, '#DA70D6'],  // Orchid
          [1, '#F8F8FF']     // Almost white for distant regions
        ],
        zmin: 0,
        zmax: colorScaleMax,  // Limit the color scale for better visualization
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
  
      try {
        console.log('Creating Plotly plot with data dimensions:', {
          rowCount: distogramData.length,
          columnCount: distogramData[0]?.length
        });
        Plotly.newPlot(plotRef.current, plotData, layout, config);
        console.log('Plotly plot created successfully');
        setError(null);
      } catch (error) {
        console.error('Error creating Plotly plot:', error);
        throw new Error(`Failed to create plot: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error in Distogram component:', err);
      setError(err instanceof Error ? err.message : 'Unknown error creating distogram');
    }

    // Cleanup
    return () => {
      if (plotRef.current) {
        Plotly.purge(plotRef.current);
      }
    };
  }, [molecule, data, width, height, source]);

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
        <p className="text-destructive font-medium mb-2">Unable to display distance matrix</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      {/* Help tooltip in the top-right corner */}
      <div className="absolute top-2 right-2 z-10">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-1.5 rounded-full bg-background/80 hover:bg-background shadow-md transition-colors">
                <Info className="h-4 w-4 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-md p-4 text-xs">
              <div className="space-y-2 text-left whitespace-pre-line">
                {distogramHelpText}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div 
        ref={plotRef} 
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
} 