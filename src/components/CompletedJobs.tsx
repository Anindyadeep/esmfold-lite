import React, { useState } from 'react';
import { Card } from './ui/card';
import { Check, X } from 'lucide-react';
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
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';

// Dummy data for completed jobs
const completedJobs = [
  { id: 'job-001', name: 'Protein Structure Analysis 1' },
  { id: 'job-002', name: 'Molecular Dynamics Simulation' },
  { id: 'job-003', name: 'Binding Site Prediction' },
  { id: 'job-004', name: 'Energy Minimization' },
  { id: 'job-005', name: 'Conformational Analysis' },
];

interface CompletedJobsProps {
  className?: string;
}

export function CompletedJobs({ className }: CompletedJobsProps) {
  const [selectedJobs, setSelectedJobs] = useState<typeof completedJobs>([]);
  const [open, setOpen] = useState(false);

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

  return (
    <div className={cn("space-y-4", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            Select completed jobs...
            <Check className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Search jobs..." />
            <CommandEmpty>No jobs found.</CommandEmpty>
            <CommandGroup>
              <ScrollArea className="h-[200px]">
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
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedJobs.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-3">Selected Jobs</h3>
          <div className="space-y-2">
            {selectedJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-2 rounded bg-muted/50"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">{job.name}</p>
                  <p className="text-xs text-muted-foreground">{job.id}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeJob(job.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
} 