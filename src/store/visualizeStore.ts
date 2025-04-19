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
    viewMode: 'cartoon',
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
    
    // Ensure we have a valid selected index if adding first structure
    let newSelectedIndex = state.selectedFileIndex;
    if (state.selectedFileIndex === null && updatedStructures.length > 0) {
      newSelectedIndex = 0;
    }
    
    return { 
      loadedStructures: updatedStructures,
      selectedFileIndex: newSelectedIndex
    };
  }),
  removeStructureById: (id) => set((state) => {
    // Find the index of the structure to remove
    const index = state.loadedStructures.findIndex(s => s.id === id);
    if (index === -1) return state; // Structure not found
    
    // Create a new array without the removed structure
    const newStructures = [...state.loadedStructures];
    newStructures.splice(index, 1);
    
    // Update selected index if needed
    let newSelectedIndex = state.selectedFileIndex;
    if (newStructures.length === 0) {
      // No structures left
      newSelectedIndex = null;
    } else if (state.selectedFileIndex === index) {
      // The selected structure was removed, select the first one
      newSelectedIndex = 0;
    } else if (state.selectedFileIndex !== null && state.selectedFileIndex > index) {
      // Selected index is after the removed one, decrement it
      newSelectedIndex = state.selectedFileIndex - 1;
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

    const newFiles = [...state.files];
    const fileToDelete = newFiles[index];
    newFiles.splice(index, 1);
    
    // Remove the corresponding structure if it exists
    const structureIndex = state.loadedStructures.findIndex(
      s => s.source === 'file' && s.id === fileToDelete.file.name
    );
    
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
    newStructures.splice(structureIndex, 1);
    
    // Update selected index properly
    let newSelectedIndex = state.selectedFileIndex;
    if (newStructures.length === 0) {
      // No structures left
      newSelectedIndex = null;
    } else if (state.selectedFileIndex === structureIndex) {
      // The selected structure was removed, select the first one
      newSelectedIndex = 0;
    } else if (state.selectedFileIndex !== null && state.selectedFileIndex > structureIndex) {
      // Selected index is after the removed one, decrement it
      newSelectedIndex = state.selectedFileIndex - 1;
    }

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