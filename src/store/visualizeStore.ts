import { create } from 'zustand'
import { Molecule } from '@/utils/pdbParser'
import { ViewMode, ColorScheme, ViewerState } from '@/types/viewer'

interface VisualizeState {
  files: { file: File; molecule?: Molecule }[];
  selectedFileIndex: number | null;
  loadedStructures: { id: string; pdbData: string }[];
  viewerState: ViewerState;
  setFiles: (files: { file: File; molecule?: Molecule }[]) => void;
  addFiles: (files: { file: File; molecule?: Molecule }[]) => void;
  updateFile: (index: number, data: { molecule?: Molecule }) => void;
  setSelectedFileIndex: (index: number | null) => void;
  setLoadedStructures: (structures: { id: string; pdbData: string }[]) => void;
  addLoadedStructures: (structures: { id: string; pdbData: string }[]) => void;
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
  addLoadedStructures: (newStructures) => set((state) => ({ 
    loadedStructures: [...state.loadedStructures, ...newStructures] 
  })),
  setViewerState: (newState) => set((state) => ({ 
    viewerState: { ...state.viewerState, ...newState } 
  })),
  deleteFile: (index) => set((state) => {
    const newFiles = [...state.files];
    const newLoadedStructures = [...state.loadedStructures];
    newFiles.splice(index, 1);
    newLoadedStructures.splice(index, 1);
    
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