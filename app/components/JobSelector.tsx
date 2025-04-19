'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from '@mui/material';

interface Job {
  job_id: string;
  job_name: string;
  created_at: string;
  completed_at: string;
  result_path: string;
}

interface JobSelectorProps {
  onSelect: (jobId: string) => void;
}

export default function JobSelector({ onSelect }: JobSelectorProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await fetch('http://localhost:8000/successful-jobs');
        if (!response.ok) {
          throw new Error('Failed to fetch jobs');
        }
        const data = await response.json();
        setJobs(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  const handleChange = (event: SelectChangeEvent) => {
    const jobId = event.target.value;
    setSelectedJob(jobId);
    onSelect(jobId);
  };

  if (loading) {
    return <div>Loading jobs...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <FormControl fullWidth>
      <InputLabel id="job-select-label">Select Job</InputLabel>
      <Select
        labelId="job-select-label"
        id="job-select"
        value={selectedJob}
        label="Select Job"
        onChange={handleChange}
      >
        {jobs.map((job) => (
          <MenuItem key={job.job_id} value={job.job_id}>
            {job.job_name} ({job.job_id})
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
} 