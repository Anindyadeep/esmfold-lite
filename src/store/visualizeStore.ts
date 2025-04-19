import { create } from 'zustand'
import { Molecule } from '@/utils/pdbParser'
import { ViewMode, ColorScheme, ViewerState } from '@/types/viewer'

interface Structure {
  id: string;
  pdbData: string;
  source: 'file' | 'job';
  molecule?: Molecule;
  name: string;
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
}

export const useVisualizeStore = create<VisualizeState>((set) => ({
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
    
    return { 
      loadedStructures: [...state.loadedStructures, ...filteredNewStructures] 
    };
  }),
  removeStructureById: (id) => set((state) => ({
    loadedStructures: state.loadedStructures.filter(s => s.id !== id)
  })),
  setViewerState: (newState) => set((state) => ({ 
    viewerState: { ...state.viewerState, ...newState } 
  })),
  deleteFile: (index) => set((state) => {
    const newFiles = [...state.files];
    const fileToDelete = newFiles[index];
    newFiles.splice(index, 1);
    
    // Remove the corresponding structure if it exists
    const newLoadedStructures = state.loadedStructures.filter(
      s => s.source === 'job' || s.id !== fileToDelete.file.name
    );
    
    let newSelectedIndex = state.selectedFileIndex;
    if (state.selectedFileIndex === index) {
      newSelectedIndex = newFiles.length > 0 ? 0 : null;
    } else if (state.selectedFileIndex !== null && state.selectedFileIndex > index) {
      newSelectedIndex = state.selectedFileIndex - 1;
    }

    return {
      files: newFiles,
      loadedStructures: newLoadedStructures,
      selectedFileIndex: newSelectedIndex
    };
  }),
})); 