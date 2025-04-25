export type ViewMode = 'default' | 'cartoon' | 'spacefill' | 'licorice' | 'surface';

export type ColorScheme = 'DEFAULT' | 'CHAIN' | 'RESIDUE' | 'ELEMENT' | 'BFACTOR' | 'SEQUENCE';

export interface ViewerState {
  viewMode: ViewMode;
  colorScheme: ColorScheme;
  atomSize: number;
  showLigand: boolean;
  showWaterIon: boolean;
  selectedResidues?: number[];
} 