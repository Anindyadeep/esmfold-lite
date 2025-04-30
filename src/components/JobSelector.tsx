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

interface JobResponse {
  job_id: string;
  job_name: string;
  status: string;
  created_at: string;
  completed_at: string;
  error_message: string | null;
  pdb_content: string;
  distogram: number[][];
  plddt_score: number;
  user_id: string;
  model: string;
}

interface Job {
  job_id: string;
  job_name: string;
  created_at: string;
  completed_at: string;
  result_path: string;
  pdb_content?: string;
  distogram?: number[][];
  plddt_score?: number;
  model?: string;
}

interface JobSelectorProps {
  onSelect?: (jobId: string) => void;
}

export function JobSelector({ onSelect }: JobSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedJobs, setSelectedJobs] = React.useState<Job[]>([]);
  const { addLoadedStructures, removeStructureById } = useVisualizeStore();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add a ref to maintain the mapping between job_id and structure_id
  const jobIdToStructureIdMap = useRef(new Map<string, string>());

  const addNewJob = useCallback(async (job: Job) => {
    try {
      // First fetch the job details if we don't have them
      let jobDetails: JobResponse;
      const API_BASE_URL = getApiUrl();
      
      if (!job.pdb_content) {
        const response = await fetch(`${API_BASE_URL}/status/${job.job_id}`, {
          method: 'GET',
          mode: 'cors',
          headers: {
            'Accept': 'application/json',
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch job details');
        }
        jobDetails = await response.json();
      } else {
        jobDetails = {
          ...job,
          status: 'completed',
          error_message: null,
          user_id: '',
          model: job.model || 'unknown'
        } as JobResponse;
      }

      if (!jobDetails.pdb_content) {
        throw new Error('No PDB content available for this job');
      }

      // Create a File object from the PDB content with a proper name
      const pdbFile = new File(
        [jobDetails.pdb_content],
        `${jobDetails.job_name}.pdb`,
        { type: 'text/plain' }
      );

      // Parse the PDB content from the job
      const molecule = await parsePDB(pdbFile);
      console.log('Parsed molecule for job:', jobDetails.job_id, molecule);
      
      // Create a unique job ID with timestamp to avoid any possibility of collision
      const uniqueJobId = `job-${jobDetails.job_id}-${Date.now()}`;
      console.log(`Generated unique job ID: ${uniqueJobId}`);
      
      // Add the structure to the store with all metadata
      addLoadedStructures([{
        id: uniqueJobId, // Unique ID with timestamp
        name: jobDetails.job_name,
        pdbData: jobDetails.pdb_content,
        source: 'job',
        molecule: molecule,
        metadata: {
          distogram: jobDetails.distogram,
          plddt_score: jobDetails.plddt_score,
          created_at: jobDetails.created_at,
          completed_at: jobDetails.completed_at,
          error_message: jobDetails.error_message,
          user_id: jobDetails.user_id,
          job_id: jobDetails.job_id, // Store original job_id in metadata
          model: jobDetails.model // Store model info in metadata
        }
      }]);
      
      // Store the mapping between job_id and the unique structure ID
      jobIdToStructureIdMap.current.set(job.job_id, uniqueJobId);
      
      console.log('Added structure for job:', jobDetails.job_id);
      return uniqueJobId;
    } catch (error) {
      console.error('Error parsing PDB data for job:', job.job_id, error);
      toast.error(`Failed to load job: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }, [addLoadedStructures]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Clean up by removing all job structures when component unmounts
      selectedJobs.forEach(job => {
        console.log('Removing structure for job:', job.job_id);
        removeStructureById(`job-${job.job_id}`);
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
  }, [addNewJob, removeStructureById]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        setError(null);
        const API_BASE_URL = getApiUrl();

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          throw new Error('You must be logged in to view jobs');
        }

        // Fetch successful jobs from the API
        const response = await fetch(`${API_BASE_URL}/successful-jobs/${user.id}`, {
          method: 'GET',
          mode: 'cors',
          headers: {
            'Accept': 'application/json',
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch successful jobs: ${response.status}`);
        }
        const data = await response.json();
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

  return (
    <div className="space-y-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-background"
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
              <CommandGroup className="p-1">
                <ScrollArea className="h-72">
                  {filteredJobs.map((job) => (
                    <CommandItem
                      key={job.job_id}
                      value={job.job_id}
                      onSelect={() => toggleJob(job)}
                      className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-accent"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-sm border",
                          selectedJobs.some(j => j.job_id === job.job_id)
                            ? "bg-primary border-primary"
                            : "border-muted"
                        )}>
                          <Check className={cn(
                            "h-4 w-4",
                            selectedJobs.some(j => j.job_id === job.job_id)
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
                  ))}
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