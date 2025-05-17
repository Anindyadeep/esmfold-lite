import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useVisualizeStore } from "@/store/visualizeStore";
import { parsePDB } from "@/utils/pdbParser";
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { getApiUrl } from '@/lib/config';
import { apiClient } from '@/lib/api-client';

// Define the maximum number of jobs that can be visualized
const MAX_JOBS = 3;

// Updated to match the new JobStatus format from the backend
interface JobStatus {
  job_id: string;
  job_name: string;
  status: string;
  created_at: string;
  completed_at?: string;
  error_message?: string;
  pdb_content?: string;
  distogram?: {
    distance_matrix: number[][];
    bin_edges: number[];
    max_distance: number;
    num_bins: number;
  };
  plddt_score?: number;
  user_id: string;
  model: string;
}

interface Job {
  job_id: string;
  job_name: string;
  created_at: string;
  completed_at: string;
  status: string;
  model?: string;
  plddt_score?: number;
}

interface JobSelectorProps {
  onSelect?: (jobId: string) => void;
}

export function JobSelector({ onSelect }: JobSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedJobs, setSelectedJobs] = React.useState<Job[]>([]);
  const { 
    addLoadedStructures, 
    removeStructureById, 
    loadedStructures, 
    canAddMoreJobs, 
    getCurrentJobCount 
  } = useVisualizeStore();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add a ref to maintain the mapping between job_id and structure_id
  const jobIdToStructureIdMap = useRef(new Map<string, string>());

  // Log the current state of loaded structures for debugging
  useEffect(() => {
    console.log('JobSelector: Current loaded structures:', loadedStructures.map(s => ({
      id: s.id,
      name: s.name,
      source: s.source
    })));
    
    if (loadedStructures.length > 0) {
      // If we have file structures already uploaded, make sure they're preserved
      const fileStructures = loadedStructures.filter(s => s.source === 'file');
      if (fileStructures.length > 0) {
        console.log('JobSelector: Found file structures to preserve:', fileStructures.length);
      }
    }
  }, [loadedStructures]);

  const addNewJob = useCallback(async (job: Job) => {
    try {
      // Check if adding another job would exceed the limit
      if (!canAddMoreJobs()) {
        toast.error(`You can only visualize up to ${MAX_JOBS} jobs at a time`);
        return null;
      }

      // Fetch the job details from the API using apiClient
      const jobStatus = await apiClient.get<JobStatus>(`jobs/${job.job_id}/status`);
      
      // Debug the API response
      console.log(`API Response for job ${job.job_id}:`, {
        hasDistogram: !!jobStatus.distogram,
        distogramType: jobStatus.distogram ? typeof jobStatus.distogram : 'undefined',
        allFields: Object.keys(jobStatus),
        model: jobStatus.model,
        plddt: jobStatus.plddt_score
      });
      
      if (!jobStatus.pdb_content) {
        throw new Error('No PDB content available for this job');
      }

      // Check if we have valid PDB content
      if (!jobStatus.pdb_content || jobStatus.pdb_content.length === 0) {
        throw new Error('Empty PDB content received from server');
      }
      
      console.log(`Received PDB content (${jobStatus.pdb_content.length} bytes) for job ${job.job_id}`);

      // Create a File object from the PDB content with a proper name
      const pdbFile = new File(
        [jobStatus.pdb_content],
        `${jobStatus.job_name}.pdb`,
        { type: 'text/plain' }
      );

      // Parse the PDB content from the job
      const molecule = await parsePDB(pdbFile);
      console.log('Parsed molecule for job:', jobStatus.job_id, 
        molecule ? `${molecule.atoms.length} atoms` : 'No molecule parsed');
      
      // Create a unique job ID with timestamp to avoid any possibility of collision
      const uniqueJobId = `job-${jobStatus.job_id}-${Date.now()}`;
      console.log(`Generated unique job ID: ${uniqueJobId}`);
      
      // Create the structure object
      const newStructure = {
        id: uniqueJobId, // Unique ID with timestamp
        name: jobStatus.job_name,
        pdbData: jobStatus.pdb_content,
        source: 'job' as const,
        molecule: molecule,
        metadata: {
          distogram: jobStatus.distogram, // Keep the entire distogram object
          plddt_score: jobStatus.plddt_score,
          created_at: jobStatus.created_at,
          completed_at: jobStatus.completed_at,
          error_message: jobStatus.error_message,
          user_id: jobStatus.user_id,
          model: jobStatus.model,
          job_id: jobStatus.job_id
        }
      };
      
      // Log details before adding to store
      console.log('Adding job structure to store:', {
        id: newStructure.id,
        name: newStructure.name,
        pdbContentSize: newStructure.pdbData ? 
          (typeof newStructure.pdbData === 'string' ? newStructure.pdbData.length : 'non-string data') : 
          'no pdbData',
        hasMolecule: !!newStructure.molecule
      });
      
      // Add the structure to the store with all metadata
      addLoadedStructures([newStructure]);
      
      // Store the mapping between job_id and the unique structure ID
      jobIdToStructureIdMap.current.set(job.job_id, uniqueJobId);
      
      console.log('Added structure for job:', jobStatus.job_id);
      
      // Check if there are any file structures already uploaded
      const fileStructures = loadedStructures.filter(s => s.source === 'file');
      if (fileStructures.length > 0) {
        console.log('Found existing file structures:', fileStructures.map(s => ({
          id: s.id,
          name: s.name,
          hasPdbData: !!(s.pdbData && typeof s.pdbData === 'string'),
          pdbDataSize: s.pdbData && typeof s.pdbData === 'string' ? s.pdbData.length : 'invalid'
        })));
      }
      
      return uniqueJobId;
    } catch (error) {
      console.error('Error adding job:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add job');
      return null;
    }
  }, [canAddMoreJobs, onSelect]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Clean up by removing all job structures when component unmounts
      selectedJobs.forEach(job => {
        const structureId = jobIdToStructureIdMap.current.get(job.job_id);
        if (structureId) {
          removeStructureById(structureId);
        }
      });
    };
  }, [selectedJobs, removeStructureById]);

  const toggleJob = useCallback(async (job: Job) => {
    setSelectedJobs(current => {
      const isSelected = current.some(j => j.job_id === job.job_id);
      if (isSelected) {
        console.log('Removing job:', job.job_id);
        // Look up the structure ID from the map
        const structureId = jobIdToStructureIdMap.current.get(job.job_id);
        if (structureId) {
          console.log(`Found structure ID ${structureId} for job ${job.job_id}, removing it`);
          removeStructureById(structureId);
          // Remove from the map
          jobIdToStructureIdMap.current.delete(job.job_id);
        } else {
          console.warn(`Could not find structure ID for job ${job.job_id}`);
        }
        return current.filter(j => j.job_id !== job.job_id);
      } else {
        console.log('Adding job:', job.job_id);
        
        // Check if adding another job would exceed the limit
        if (!canAddMoreJobs()) {
          toast.error(`You can only visualize up to ${MAX_JOBS} jobs at a time`);
          return current;
        }
        
        // Add the job in a non-blocking way and don't wait for the result
        addNewJob(job).then(structureId => {
          if (!structureId) {
            console.error(`Failed to add job ${job.job_id}`);
          }
        });
        return [...current, job];
      }
    });

    // Refresh the view after adding/removing a job
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  }, [addNewJob, removeStructureById, canAddMoreJobs]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch successful jobs from the API using apiClient
        const data = await apiClient.get<Job[]>('jobs/successful');
        setJobs(data);
      } catch (err) {
        console.error('Error fetching jobs:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  const filteredJobs = jobs.filter(job => 
    job.job_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="p-4">Loading jobs...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  // Helper function to get a model display name
  const getModelDisplayName = (modelId: string): string => {
    switch(modelId?.toLowerCase()) {
      case 'esm3':
        return 'ESM-3';
      case 'alphafold2':
        return 'AlphaFold2';
      default:
        return modelId || 'Unknown';
    }
  };

  // Helper function to get a badge color for the model
  const getModelBadgeVariant = (modelId: string): "default" | "secondary" | "outline" => {
    switch(modelId?.toLowerCase()) {
      case 'esm3':
        return "default";
      case 'alphafold2':
        return "secondary";
      default:
        return "outline";
    }
  };

  // Determine if we should disable the job selection
  const isJobSelectionDisabled = selectedJobs.length >= MAX_JOBS || getCurrentJobCount() >= MAX_JOBS;

  return (
    <div className="space-y-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-background"
            disabled={jobs.length === 0}
          >
            <span className="flex items-center gap-2">
              {selectedJobs.length > 0 ? (
                <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                  {selectedJobs.length} selected
                </Badge>
              ) : (
                "Select jobs for visualization"
              )}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command className="rounded-lg border shadow-md">
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput 
                placeholder="Search jobs..." 
                className="h-11 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
            </div>
            <CommandList>
              <CommandEmpty className="py-6 text-center text-sm">
                No jobs found.
              </CommandEmpty>
              {isJobSelectionDisabled && (
                <div className="p-3 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border-b">
                  You can only visualize up to {MAX_JOBS} jobs at a time.
                </div>
              )}
              <CommandGroup className="p-1">
                <ScrollArea className="h-72">
                  {filteredJobs.map((job) => {
                    const isSelected = selectedJobs.some(j => j.job_id === job.job_id);
                    const isDisabled = !isSelected && isJobSelectionDisabled;
                    
                    return (
                      <CommandItem
                        key={job.job_id}
                        value={job.job_id}
                        onSelect={() => !isDisabled && toggleJob(job)}
                        className={cn(
                          "flex items-center justify-between px-4 py-3",
                          isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-accent"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "flex h-5 w-5 items-center justify-center rounded-sm border",
                            isSelected
                              ? "bg-primary border-primary"
                              : "border-muted"
                          )}>
                            <Check className={cn(
                              "h-4 w-4",
                              isSelected
                                ? "text-primary-foreground"
                                : "opacity-0"
                            )} />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium">{job.job_name}</span>
                            <span className="text-xs text-muted-foreground">
                              Completed: {new Date(job.completed_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {job.model && (
                            <Badge variant={getModelBadgeVariant(job.model)} className="text-xs">
                              {getModelDisplayName(job.model)}
                            </Badge>
                          )}
                          {job.plddt_score !== undefined && (
                            <Badge variant="outline" className="ml-2">
                              pLDDT: {job.plddt_score.toFixed(1)}
                            </Badge>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
                </ScrollArea>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedJobs.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-3">Selected Jobs for Visualization</h3>
          <div className="flex flex-wrap gap-2">
            {selectedJobs.map((job) => (
              <Badge
                key={job.job_id}
                variant="secondary"
                className="flex items-center gap-2 py-1 px-3"
              >
                <span className="flex items-center gap-1">
                  {job.job_name}
                  {job.model && (
                    <Badge variant={getModelBadgeVariant(job.model)} className="ml-1 text-xs">
                      {getModelDisplayName(job.model)}
                    </Badge>
                  )}
                </span>
                <button
                  className="ml-1 hover:text-destructive transition-colors"
                  onClick={() => toggleJob(job)}
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
} 