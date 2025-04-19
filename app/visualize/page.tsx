'use client';

import { useState, useEffect } from 'react';
import { Box, Container, Typography } from '@mui/material';
import JobSelector from '../components/JobSelector';

interface Job {
  job_id: string;
  job_name: string;
  created_at: string;
  completed_at: string;
  result_path: string;
}

export default function VisualizePage() {
  const [selectedJob, setSelectedJob] = useState<string | null>(null);

  const handleJobSelect = (jobId: string) => {
    setSelectedJob(jobId);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Protein Structure Visualization
      </Typography>
      
      <Box sx={{ mb: 4 }}>
        <JobSelector onSelect={handleJobSelect} />
      </Box>

      {selectedJob && (
        <Box>
          {/* Visualization component will be added here */}
          <Typography>Selected Job ID: {selectedJob}</Typography>
        </Box>
      )}
    </Container>
  );
} 