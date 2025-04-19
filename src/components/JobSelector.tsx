import React, { useEffect, useCallback, useState } from 'react';
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
      
      // Add the structure to the store with all metadata
      // Use the job_id as the unique identifier to ensure multiple jobs work correctly
      addLoadedStructures([{
        id: `job-${jobDetails.job_id}`, // Make sure each job has a unique ID prefixed
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
          user_id: jobDetails.user_id
        }
      }]);
      
      console.log('Added structure for job:', jobDetails.job_id);
    } catch (error) {
      console.error('Error parsing PDB data for job:', job.job_id, error);
      toast.error(`Failed to load job: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        // Use the same prefixed ID format for removing
        removeStructureById(`job-${job.job_id}`);
        return current.filter(j => j.job_id !== job.job_id);
      } else {
        console.log('Adding job:', job.job_id);
        void addNewJob(job);
        return [...current, job];
      }
    });
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
                      {job.plddt_score !== undefined && (
                        <Badge variant="secondary" className="ml-2">
                          pLDDT: {job.plddt_score.toFixed(1)}
                        </Badge>
                      )}
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
                {job.job_name}
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