import React from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { ViewerState } from './index';
import { Molecule } from '@/utils/pdbParser';
import { parsePDB } from '@/utils/pdbParser';
import { Check, X, ChevronsUpDown } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Dummy data for completed jobs
const completedJobs = [
  { id: 'ESM-1', name: 'Protein Structure Prediction 1' },
  { id: 'ESM-2', name: 'Protein Structure Prediction 2' },
  { id: 'ESM-3', name: 'Protein Structure Prediction 3' },
  { id: 'ESM-4', name: 'Protein Structure Prediction 4' },
  { id: 'ESM-5', name: 'Protein Structure Prediction 5' },
];

interface ViewerControlsProps {
  viewerState: ViewerState;
  molecules: { file: File; molecule?: Molecule }[];
  selectedMoleculeIndex: number | null;
  onViewModeChange: (mode: string) => void;
  onAtomSizeChange: (size: number) => void;
  onLigandVisibilityChange: (visible: boolean) => void;
  onWaterIonVisibilityChange: (visible: boolean) => void;
  onColorSchemeChange: (scheme: number) => void;
  onFilesUploaded: (files: File[]) => void;
  onDeleteMolecule: (index: number) => void;
  onSelectMolecule: (index: number) => void;
}

export function ViewerControls({
  viewerState,
  molecules,
  selectedMoleculeIndex,
  onViewModeChange,
  onAtomSizeChange,
  onLigandVisibilityChange,
  onWaterIonVisibilityChange,
  onColorSchemeChange,
  onFilesUploaded,
  onDeleteMolecule,
  onSelectMolecule
}: ViewerControlsProps) {
  const [selectedJobs, setSelectedJobs] = React.useState<typeof completedJobs>([]);
  const [open, setOpen] = React.useState(false);

  const toggleJob = (job: typeof completedJobs[0]) => {
    setSelectedJobs(current => {
      const isSelected = current.some(j => j.id === job.id);
      if (isSelected) {
        return current.filter(j => j.id !== job.id);
      } else {
        return [...current, job];
      }
    });
  };

  const removeJob = (jobId: string) => {
    setSelectedJobs(current => current.filter(job => job.id !== jobId));
  };

  // Color schemes
  const colorSchemes = [
    ['#8B5CF6', '#D946EF', '#F97316', '#0EA5E9'], // Purple to Blue
    ['#1A1F2C', '#7E69AB', '#9b87f5', '#D6BCFA'], // Dark to Light Purple
    ['#F97316', '#FACC15', '#4ADE80', '#2DD4BF'], // Warm to Cool
    ['#EC4899', '#F43F5E', '#EF4444', '#F59E0B'], // Pink to Orange
    ['#06B6D4', '#6366F1', '#A855F7', '#EC4899'], // Blue to Purple to Pink
  ];

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Process each file
    const processedFiles = await Promise.all(
      files.map(async (file) => {
        try {
          const molecule = await parsePDB(file);
          return { file, molecule };
        } catch (error) {
          console.error('Error parsing PDB file:', error);
          return { file };
        }
      })
    );

    onFilesUploaded(files);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const files = Array.from(event.dataTransfer.files);
    if (files.length === 0) return;

    // Process dropped files
    const processedFiles = await Promise.all(
      files.map(async (file) => {
        try {
          const molecule = await parsePDB(file);
          return { file, molecule };
        } catch (error) {
          console.error('Error parsing PDB file:', error);
          return { file };
        }
      })
    );

    onFilesUploaded(files);
  };

  return (
    <div className="space-y-6">
      {/* File Upload Section */}
      <Card className="p-4">
        <h2 className="text-xl font-semibold mb-4">Upload Files</h2>
        <div
          className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center cursor-pointer"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <input
            type="file"
            id="file-upload"
            className="hidden"
            multiple
            accept=".pdb,.cif,.ent,.gz"
            onChange={handleFileChange}
          />
          <div className="flex flex-col items-center gap-2">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Click to upload or drag and drop
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-500">
              .pdb files only
            </span>
          </div>
        </div>

        {/* File List */}
        <div className="mt-4 space-y-2">
          {molecules.map((mol, index) => (
            <div
              key={mol.file.name + index}
              className={`flex items-center justify-between p-2 rounded ${
                selectedMoleculeIndex === index
                  ? 'bg-purple-100 dark:bg-purple-900'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <button
                className="flex-1 text-left truncate"
                onClick={() => onSelectMolecule(index)}
              >
                {mol.file.name}
              </button>
              <button
                className="text-red-500 hover:text-red-700"
                onClick={() => onDeleteMolecule(index)}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Completed Jobs Section */}
        <div className="mt-6">
          <h3 className="text-sm font-medium mb-2">Completed Jobs</h3>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between"
              >
                {selectedJobs.length === 0
                  ? "Select completed jobs..."
                  : `${selectedJobs.length} job${selectedJobs.length === 1 ? '' : 's'} selected`}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
              <Command>
                <CommandInput placeholder="Search jobs..." />
                <CommandEmpty>No jobs found.</CommandEmpty>
                <CommandGroup className="max-h-[200px] overflow-auto">
                  {completedJobs.map((job) => (
                    <CommandItem
                      key={job.id}
                      onSelect={() => toggleJob(job)}
                      className="flex items-center gap-2"
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                          selectedJobs.some(j => j.id === job.id)
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50 [&_svg]:invisible"
                        )}
                      >
                        <Check className={cn("h-4 w-4")} />
                      </div>
                      <span>{job.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {job.id}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Selected Jobs List */}
          <div className="mt-4 space-y-2">
            {selectedJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <div className="flex-1 truncate">
                  <span className="text-sm">{job.name}</span>
                  <span className="text-xs text-gray-500 ml-2">({job.id})</span>
                </div>
                <button
                  className="text-red-500 hover:text-red-700"
                  onClick={() => removeJob(job.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* View Settings */}
      <Card className="p-4">
        <h2 className="text-xl font-semibold mb-4">View Settings</h2>
        
        {/* Representation */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Representation
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'cartoon', label: 'Cartoon' },
                { id: 'ball-stick', label: 'Ball & Stick' },
                { id: 'surface', label: 'Surface' }
              ].map((mode) => (
                <Button
                  key={mode.id}
                  variant={viewerState.viewMode === mode.id ? 'default' : 'outline'}
                  onClick={() => onViewModeChange(mode.id)}
                  className="w-full"
                >
                  {mode.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Atom Size */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Atom Size
            </label>
            <Slider
              value={[viewerState.atomSize]}
              onValueChange={(value) => onAtomSizeChange(value[0])}
              min={0.1}
              max={2}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Color Theme */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Color Theme
            </label>
            <div className="flex gap-2">
              {colorSchemes.map((scheme, index) => (
                <button
                  key={index}
                  className={`w-8 h-8 rounded-full ${
                    viewerState.colorScheme === index
                      ? 'ring-2 ring-offset-2 ring-purple-500'
                      : ''
                  }`}
                  style={{ backgroundColor: scheme[0] }}
                  onClick={() => onColorSchemeChange(index)}
                />
              ))}
            </div>
          </div>

          {/* Visibility Toggles */}
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={viewerState.showLigand}
                onChange={(e) => onLigandVisibilityChange(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span>Show Ligand</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={viewerState.showWaterIon}
                onChange={(e) => onWaterIonVisibilityChange(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span>Show Water + Ion</span>
            </label>
          </div>
        </div>
      </Card>
    </div>
  );
} 