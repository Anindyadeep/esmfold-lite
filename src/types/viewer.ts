export type ViewMode = 'cartoon' | 'spacefill' | 'licorice' | 'surface';

export interface ViewerState {
  atomSize: number;
  showLigand: boolean;
  showWaterIon: boolean;
  viewMode: ViewMode;
} 