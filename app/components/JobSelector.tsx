'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { apiClient, Job, JobList } from '../../src/lib/api-client';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../../src/components/ui/select";
import { Button } from "../../src/components/ui/button";
import { Alert, AlertDescription } from "../../src/components/ui/alert";
import { ReloadIcon, AlertCircleIcon, CheckIcon } from "../../components/ui/icons";
import { Skeleton } from "../../components/ui/skeleton";

interface JobSelectorProps {
  onSelect: (jobId: string) => void;
}

export default function JobSelector({ onSelect }: JobSelectorProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchJobs = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await apiClient.get<JobList>('jobs/successful');
        
        if (isMounted) {
          setJobs(data);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching jobs:', err);
          setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchJobs();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (value: string) => {
    setSelectedJob(value);
    onSelect(value);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4 animate-in">
        <AlertCircleIcon className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between w-full">
          <span>{error}</span>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
            size="sm"
            className="ml-2 bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20"
          >
            <ReloadIcon className="mr-2 h-3 w-3" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (jobs.length === 0) {
    return (
      <Alert className="bg-accent/10 border-accent/30 text-accent-foreground">
        <CheckIcon className="h-4 w-4" />
        <AlertDescription>
          No jobs available. Please submit a new job.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-2">
      <label htmlFor="job-select" className="text-sm font-medium">
        Select Job
      </label>
      <Select
        value={selectedJob}
        onValueChange={handleChange}
      >
        <SelectTrigger id="job-select" className="w-full input-focus-ring">
          <SelectValue placeholder="Select a job" />
        </SelectTrigger>
        <SelectContent>
          {jobs.map((job) => (
            <SelectItem 
              key={job.job_id} 
              value={job.job_id}
              className="transition-colors hover:bg-accent/10 cursor-pointer"
            >
              <span className="font-medium">{job.job_name || 'Unnamed Job'}</span>
              <span className="text-muted-foreground ml-2 text-xs">({job.job_id})</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 