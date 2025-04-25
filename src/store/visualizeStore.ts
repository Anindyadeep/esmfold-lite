import { create } from 'zustand'
import { Molecule } from '@/utils/pdbParser'
import { ViewMode, ColorScheme, ViewerState } from '@/types/viewer'

interface Structure {
  id: string;
  pdbData: string;
  source: 'file' | 'job';
  molecule?: Molecule;
  name: string;
  metadata?: {
    distogram?: number[][];
    plddt_score?: number;
    created_at?: string;
    completed_at?: string;
    error_message?: string | null;
    user_id?: string;
  };
}

interface VisualizeState {
  files: { file: File; molecule?: Molecule }[];
  selectedFileIndex: number | null;
  loadedStructures: Structure[];
  viewerState: ViewerState;
  setFiles: (files: { file: File; molecule?: Molecule }[]) => void;
  addFiles: (files: { file: File; molecule?: Molecule }[]) => void;
  updateFile: (index: number, data: { molecule?: Molecule }) => void;
  setSelectedFileIndex: (index: number | null) => void;
  setLoadedStructures: (structures: Structure[]) => void;
  addLoadedStructures: (structures: Structure[]) => void;
  removeStructureById: (id: string) => void;
  deleteLoadedStructure: (index: number) => void;
  setViewerState: (state: Partial<ViewerState>) => void;
  deleteFile: (index: number) => void;
  updateStructureMetadata: (id: string, metadata: Structure['metadata']) => void;
  getSelectedStructure: () => Structure | null;
}

export const useVisualizeStore = create<VisualizeState>((set, get) => ({
  files: [],
  selectedFileIndex: null,
  loadedStructures: [],
  viewerState: {
    viewMode: 'default',
    colorScheme: 'DEFAULT',
    atomSize: 1.0,
    showLigand: true,
    showWaterIon: false
  },
  setFiles: (files) => set({ files }),
  addFiles: (newFiles) => set((state) => ({ 
    files: [...state.files, ...newFiles] 
  })),
  updateFile: (index, data) => set((state) => {
    const newFiles = [...state.files];
    newFiles[index] = { ...newFiles[index], ...data };
    return { files: newFiles };
  }),
  setSelectedFileIndex: (index) => set({ selectedFileIndex: index }),
  setLoadedStructures: (structures) => set({ loadedStructures: structures }),
  addLoadedStructures: (newStructures) => set((state) => {
    // Filter out any structures with IDs that already exist
    const existingIds = new Set(state.loadedStructures.map(s => s.id));
    const filteredNewStructures = newStructures.filter(s => !existingIds.has(s.id));
    
    // Create updated structures array
    const updatedStructures = [...state.loadedStructures, ...filteredNewStructures];
    
    // For job structures, preserve the current selection if it's valid
    // Only auto-select the first structure if no selection exists
    let newSelectedIndex = state.selectedFileIndex;
    
    if (state.selectedFileIndex === null && updatedStructures.length > 0) {
      newSelectedIndex = 0;
      console.log('Auto-selecting first structure as none was selected');
    } else if (state.selectedFileIndex !== null && state.selectedFileIndex >= updatedStructures.length) {
      // If the current selection is out of bounds, select the first structure
      newSelectedIndex = 0;
      console.log('Current selection out of bounds, resetting to first structure');
    } else {
      console.log('Preserving current selection at index:', state.selectedFileIndex);
    }
    
    console.log('Updated structures array:', {
      before: state.loadedStructures.length,
      added: filteredNewStructures.length,
      after: updatedStructures.length,
      selectedIndex: newSelectedIndex
    });
    
    return { 
      loadedStructures: updatedStructures,
      selectedFileIndex: newSelectedIndex
    };
  }),
  removeStructureById: (id) => set((state) => {
    // Find the index of the structure to remove
    const index = state.loadedStructures.findIndex(s => s.id === id);
    if (index === -1) {
      console.warn(`Structure with ID '${id}' not found`);
      return state; // Structure not found
    }
    
    console.log(`Removing structure with ID '${id}' at index ${index}`);
    console.log('Structure details:', {
      id: state.loadedStructures[index].id,
      name: state.loadedStructures[index].name,
      source: state.loadedStructures[index].source
    });
    
    // Create a new array without the removed structure
    const newStructures = [...state.loadedStructures];
    newStructures.splice(index, 1);
    
    console.log(`After removal: ${newStructures.length} structures remain`);
    
    // Update selected index if needed
    let newSelectedIndex = state.selectedFileIndex;
    if (newStructures.length === 0) {
      // No structures left
      newSelectedIndex = null;
      console.log('No structures left, setting selectedFileIndex to null');
    } else if (state.selectedFileIndex === index) {
      // The selected structure was removed, select the first one
      newSelectedIndex = 0;
      console.log('Selected structure was removed, setting selectedFileIndex to 0');
    } else if (state.selectedFileIndex !== null && state.selectedFileIndex > index) {
      // Selected index is after the removed one, decrement it
      newSelectedIndex = state.selectedFileIndex - 1;
      console.log(`Selected index was after removed one, decrementing from ${state.selectedFileIndex} to ${newSelectedIndex}`);
    } else {
      console.log(`Selected index (${state.selectedFileIndex}) not affected by removal at index ${index}`);
    }
    
    return {
      loadedStructures: newStructures,
      selectedFileIndex: newSelectedIndex
    };
  }),
  deleteLoadedStructure: (index) => set((state) => {
    // Guard against invalid index
    if (index < 0 || index >= state.loadedStructures.length) {
      console.error('Invalid structure index to delete:', index);
      return state;
    }

    console.log(`Deleting structure at index ${index}`);
    const structureToDelete = state.loadedStructures[index];
    console.log('Structure to delete:', structureToDelete.id, structureToDelete.name);
    
    // Create a new array without the removed structure
    const newStructures = [...state.loadedStructures];
    newStructures.splice(index, 1);
    
    console.log(`After removal: ${newStructures.length} structures remain`);
    console.log('Remaining structure IDs:', newStructures.map(s => s.id));
    
    // Update selected index if needed
    let newSelectedIndex = state.selectedFileIndex;
    if (newStructures.length === 0) {
      // No structures left
      newSelectedIndex = null;
      console.log('No structures left, setting selectedFileIndex to null');
    } else if (state.selectedFileIndex === index) {
      // The selected structure was removed, select the first one
      newSelectedIndex = 0;
      console.log('Selected structure was removed, setting selectedFileIndex to 0');
    } else if (state.selectedFileIndex !== null && state.selectedFileIndex > index) {
      // Selected index is after the removed one, decrement it
      newSelectedIndex = state.selectedFileIndex - 1;
      console.log(`Selected index was after removed one, decrementing from ${state.selectedFileIndex} to ${newSelectedIndex}`);
    } else {
      console.log(`Selected index (${state.selectedFileIndex}) not affected by removal at index ${index}`);
    }
    
    // If the structure to delete was from a file source, try to find and remove the corresponding file
    if (structureToDelete.source === 'file') {
      const fileNameFromStructure = structureToDelete.name;
      const fileIndex = state.files.findIndex(f => f.file.name === fileNameFromStructure);
      
      if (fileIndex !== -1) {
        console.log(`Found corresponding file at index ${fileIndex}, removing it as well`);
        const newFiles = [...state.files];
        newFiles.splice(fileIndex, 1);
        
        return {
          loadedStructures: newStructures,
          selectedFileIndex: newSelectedIndex,
          files: newFiles
        };
      }
    }
    
    return {
      loadedStructures: newStructures,
      selectedFileIndex: newSelectedIndex
    };
  }),
  setViewerState: (newState) => set((state) => ({ 
    viewerState: { ...state.viewerState, ...newState } 
  })),
  updateStructureMetadata: (id, metadata) => set((state) => ({
    loadedStructures: state.loadedStructures.map(structure => 
      structure.id === id 
        ? { ...structure, metadata: { ...structure.metadata, ...metadata } }
        : structure
    )
  })),
  deleteFile: (index) => set((state) => {
    // Guard against invalid index
    if (index < 0 || index >= state.files.length) {
      console.error('Invalid file index to delete:', index);
      return state;
    }

    console.log(`Deleting file at index ${index}`);
    const newFiles = [...state.files];
    const fileToDelete = newFiles[index];
    console.log('File to delete:', fileToDelete.file.name);
    newFiles.splice(index, 1);
    
    // Get current structure IDs for debugging
    const structureIds = state.loadedStructures.map(s => s.id);
    console.log('Current structure IDs:', structureIds);
    
    // Fix: Use includes instead of exact match to find the structure
    // Structure IDs are created as `file-${file.name}-${Date.now()}`
    const structureIndex = state.loadedStructures.findIndex(
      s => s.source === 'file' && s.id.includes(fileToDelete.file.name)
    );
    
    console.log(`File: ${fileToDelete.file.name}, Found structure at index: ${structureIndex}`);
    
    // If structure wasn't found, just update files
    if (structureIndex === -1) {
      console.warn('Deleted file had no corresponding structure:', fileToDelete.file.name);
      
      // Update selected file index if needed
      let newSelectedIndex = state.selectedFileIndex;
      if (newFiles.length === 0) {
        newSelectedIndex = null;
      } else if (state.selectedFileIndex === index) {
        newSelectedIndex = 0;
      } else if (state.selectedFileIndex !== null && state.selectedFileIndex > index) {
        newSelectedIndex = state.selectedFileIndex - 1;
      }
      
      return {
        files: newFiles,
        selectedFileIndex: newSelectedIndex
      };
    }
    
    // Create a new array without the removed structure
    const newStructures = [...state.loadedStructures];
    const structureToRemove = newStructures[structureIndex];
    console.log('Structure being removed:', structureToRemove.id);
    newStructures.splice(structureIndex, 1);
    
    console.log(`Removed structure. Old length: ${state.loadedStructures.length}, New length: ${newStructures.length}`);
    console.log('Remaining structure IDs:', newStructures.map(s => s.id));
    
    // Update selected index properly
    let newSelectedIndex = state.selectedFileIndex;
    if (newStructures.length === 0) {
      // No structures left
      newSelectedIndex = null;
      console.log('No structures left, setting selectedFileIndex to null');
    } else if (state.selectedFileIndex === structureIndex) {
      // The selected structure was removed, select the first one
      newSelectedIndex = 0;
      console.log('Selected structure was removed, setting selectedFileIndex to 0');
    } else if (state.selectedFileIndex !== null && state.selectedFileIndex > structureIndex) {
      // Selected index is after the removed one, decrement it
      newSelectedIndex = state.selectedFileIndex - 1;
      console.log(`Selected index was after removed one, decrementing from ${state.selectedFileIndex} to ${newSelectedIndex}`);
    } else {
      console.log(`Selected index (${state.selectedFileIndex}) not affected by removal at index ${structureIndex}`);
    }

    console.log(`Updated selectedFileIndex from ${state.selectedFileIndex} to ${newSelectedIndex}`);
    
    return {
      files: newFiles,
      loadedStructures: newStructures,
      selectedFileIndex: newSelectedIndex
    };
  }),
  
  // Helper method to get the currently selected structure
  getSelectedStructure: () => {
    const { selectedFileIndex, loadedStructures } = get();
    if (selectedFileIndex === null || !loadedStructures[selectedFileIndex]) {
      return null;
    }
    return loadedStructures[selectedFileIndex];
  }
})); 