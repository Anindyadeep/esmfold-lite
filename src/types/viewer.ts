export type ViewMode = 'cartoon' | 'spacefill' | 'licorice' | 'surface';

export type ColorScheme = 'DEFAULT' | 'ELEMENT' | 'RESIDUE' | 'CHAIN' | 'BFACTOR' | 'ATOMINDEX' | 'ELECTROSTATIC' | 'CUSTOM';

export interface ViewerState {
  viewMode: ViewMode;
  colorScheme: ColorScheme;
} 