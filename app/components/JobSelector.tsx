'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { getApiUrl } from '../lib/config';

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
        const API_BASE_URL = getApiUrl();
        console.log('Fetching jobs from:', API_BASE_URL);
        
        try {
          const response = await fetch(`${API_BASE_URL}/successful-jobs`, {
            method: 'GET',
            mode: 'cors',
            headers: {
              'Accept': 'application/json',
            }
          });
          
          if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`Failed to fetch jobs: ${response.status} - ${errorText}`);
          }
          
          const data = await response.json();
          setJobs(data);
        } catch (fetchError) {
          console.error('Network error fetching jobs:', fetchError);
          setError(fetchError instanceof Error ? fetchError.message : 'Network error fetching jobs');
        }
      } catch (err) {
        console.error('Error in job fetching process:', err);
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