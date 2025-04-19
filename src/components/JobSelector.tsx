import React, { useEffect, useCallback } from 'react';
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

// Dummy PDB data from pp.pdb
const DUMMY_PDB = `HEADER    MINIMAL PDB
ATOM      1  N   ALA A   1       1.204   2.345   3.456  1.00 20.00           N  
ATOM      2  CA  ALA A   1       1.456   3.789   3.876  1.00 20.00           C  
ATOM      3  C   ALA A   1       2.987   4.000   4.123  1.00 20.00           C  
ATOM      4  O   ALA A   1       3.789   3.234   3.789  1.00 20.00           O  
ATOM      5  CB  ALA A   1       0.456   4.123   4.567  1.00 20.00           C  
TER
END`;

// Dummy data for succeeded jobs
const dummyJobs = [
  { id: "job-1", name: "Protein Structure 1", status: "succeeded", timestamp: "2024-03-20" },
  { id: "job-2", name: "Protein Analysis 2", status: "succeeded", timestamp: "2024-03-19" },
  { id: "job-3", name: "Molecule Study 3", status: "succeeded", timestamp: "2024-03-18" },
  { id: "job-4", name: "Structure Prediction 4", status: "succeeded", timestamp: "2024-03-17" },
  { id: "job-5", name: "Protein Folding 5", status: "succeeded", timestamp: "2024-03-16" },
  { id: "job-6", name: "Analysis Task 6", status: "succeeded", timestamp: "2024-03-15" },
  { id: "job-7", name: "Structure Task 7", status: "succeeded", timestamp: "2024-03-14" },
  { id: "job-8", name: "Protein Study 8", status: "succeeded", timestamp: "2024-03-13" },
  { id: "job-9", name: "Molecule Analysis 9", status: "succeeded", timestamp: "2024-03-12" },
  { id: "job-10", name: "Folding Task 10", status: "succeeded", timestamp: "2024-03-11" },
];

interface Job {
  id: string;
  name: string;
  status: string;
  timestamp: string;
}

export function JobSelector() {
  const [open, setOpen] = React.useState(false);
  const [selectedJobs, setSelectedJobs] = React.useState<Job[]>([]);
  const { addLoadedStructures, removeStructureById } = useVisualizeStore();

  const addNewJob = useCallback(async (job: Job) => {
    try {
      // Parse the PDB data to get the molecule
      const molecule = await parsePDB(new Blob([DUMMY_PDB], { type: 'text/plain' }));
      console.log('Parsed molecule for job:', job.id, molecule); // Debug log
      
      // Add the structure to the store
      addLoadedStructures([{
        id: job.id,
        name: job.name,
        pdbData: DUMMY_PDB,
        source: 'job',
        molecule: molecule // Make sure molecule is passed
      }]);
      
      console.log('Added structure for job:', job.id); // Debug log
    } catch (error) {
      console.error('Error parsing PDB data for job:', job.id, error);
    }
  }, [addLoadedStructures]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Clean up by removing all job structures when component unmounts
      selectedJobs.forEach(job => {
        console.log('Removing structure for job:', job.id); // Debug log
        removeStructureById(job.id);
      });
    };
  }, [selectedJobs, removeStructureById]);

  const toggleJob = useCallback(async (job: Job) => {
    setSelectedJobs(current => {
      const isSelected = current.some(j => j.id === job.id);
      if (isSelected) {
        console.log('Removing job:', job.id); // Debug log
        removeStructureById(job.id);
        return current.filter(j => j.id !== job.id);
      } else {
        console.log('Adding job:', job.id); // Debug log
        void addNewJob(job);
        return [...current, job];
      }
    });
  }, [addNewJob, removeStructureById]);

  // Debug log for render
  console.log('JobSelector render - Selected jobs:', selectedJobs);

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
              />
            </div>
            <CommandList>
              <CommandEmpty className="py-6 text-center text-sm">
                No jobs found.
              </CommandEmpty>
              <CommandGroup className="p-1">
                <ScrollArea className="h-72">
                  {dummyJobs.map((job) => (
                    <CommandItem
                      key={job.id}
                      value={job.id}
                      onSelect={() => toggleJob(job)}
                      className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-accent"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-sm border",
                          selectedJobs.some(j => j.id === job.id)
                            ? "bg-primary border-primary"
                            : "border-muted"
                        )}>
                          <Check className={cn(
                            "h-4 w-4",
                            selectedJobs.some(j => j.id === job.id)
                              ? "text-primary-foreground"
                              : "opacity-0"
                          )} />
                        </div>
                        <span className="font-medium">{job.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {job.timestamp}
                      </span>
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
                key={job.id}
                variant="secondary"
                className="flex items-center gap-2 py-1 px-3"
              >
                {job.name}
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