import React, { forwardRef, useRef, useEffect } from 'react';
import { MolStarViewer } from './MolStarViewer';
import { NGLViewer } from './NGLViewer';
import { ViewerState } from '@/types/viewer';

interface VisualizationWrapperProps {
  structures: { 
    id: string; 
    pdbData: string;
    name?: string;
    source?: 'file' | 'job';
  }[];
  viewerState: ViewerState;
}

export const VisualizationWrapper = forwardRef<any, VisualizationWrapperProps>(
  ({ structures, viewerState }, ref) => {
    const prevStructuresRef = useRef<string[]>([]);
    
    useEffect(() => {
      const currentIds = structures.map(s => s.id);
      const prevIds = prevStructuresRef.current;
      
      const addedIds = currentIds.filter(id => !prevIds.includes(id));
      const removedIds = prevIds.filter(id => !currentIds.includes(id));
      
      console.log(
        `VisualizationWrapper structure update:`,
        {
          total: structures.length,
          added: addedIds.length ? addedIds : 'none',
          removed: removedIds.length ? removedIds : 'none',
          current: currentIds
        }
      );
      
      // Update for next comparison
      prevStructuresRef.current = currentIds;
    }, [structures]);
    
    console.log(
      `Using MolStar renderer. ` +
      `View mode: ${viewerState.viewMode}, Color scheme: ${viewerState.colorScheme}`
    );
    
    // Create a stable key based on structure IDs and the renderer type
    // This will force re-creation when structures change or renderer switches
    const viewerKey = `molstar-${structures.map(s => s.id).join('-')}`;
    
    return (
      <div className="relative w-full h-full">
          <MolStarViewer
            structures={structures}
            viewerState={viewerState}
            ref={ref}
            key={viewerKey}
          />
      </div>
    );    
  }
); 