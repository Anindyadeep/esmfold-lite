// Viewer components
export { NGLViewer } from './NGLViewer';
export { MolStarViewer } from './MolStarViewer';

// Re-export types
export type { ViewerState, ViewMode, ColorScheme } from '@/types/viewer';

// This file makes it easy to switch between the two viewer implementations
// If you want to switch back to the NGL viewer, simply change the imports in 
// your components from:
//   import { MolStarViewer } from '@/components';
// to:
//   import { NGLViewer } from '@/components'; 