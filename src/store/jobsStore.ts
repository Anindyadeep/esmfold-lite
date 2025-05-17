import { create } from 'zustand'
import { supabase, LiteFoldJob } from '@/lib/supabase'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'
import { getApiUrl } from '@/lib/config'
import { apiClient } from '@/lib/api-client'
import { submitSequenceForPrediction, analyzeSequenceQuality } from '@/lib/sequenceService'

interface Job {
  id: string;
  name: string;
  description: string;
  status: 'completed' | 'running' | 'failed' | 'queued';
  submittedAt: string;
  completedAt?: string;
}

interface JobFormData {
  name: string;
  description: string;
  inputString: string;
  selectedModel: string;
}

interface DeleteJobResponse {
  job_id: string;
  user_id: string;
  success: boolean;
  error_message?: string;
}

interface JobsState {
  jobs: LiteFoldJob[];
  formData: JobFormData;
  setJobs: (jobs: LiteFoldJob[]) => void;
  addJob: (job: LiteFoldJob) => void;
  setFormData: (data: Partial<JobFormData>) => void;
  resetFormData: () => void;
  submitJob: () => Promise<void>;
  fetchJobs: () => Promise<void>;
  updateJobStatus: (jobId: string) => Promise<void>;
  deleteJob: (jobId: string) => Promise<void>;
  isLoading: boolean;
}

const initialFormData: JobFormData = {
  name: "",
  description: "",
  inputString: "",
  selectedModel: "alphafold2",
};

export const useJobsStore = create<JobsState>((set, get) => ({
  jobs: [],
  isLoading: false,
  formData: initialFormData,
  setJobs: (jobs) => set({ jobs }),
  addJob: (job) => set((state) => ({ jobs: [...state.jobs, job] })),
  setFormData: (data) => set((state) => ({ 
    formData: { ...state.formData, ...data } 
  })),
  resetFormData: () => set({ formData: initialFormData }),

  submitJob: async () => {
    const { formData } = get();
    const jobId = uuidv4();

    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('You must be logged in to submit a job');
      }
      
      // Analyze sequence for potential issues
      const { issues, hasIssues, cleanedSequence } = analyzeSequenceQuality(formData.inputString);
      
      // Warn about non-critical issues but continue
      if (hasIssues) {
        issues.forEach(issue => {
          console.warn(`Sequence issue: ${issue}`);
          // Maybe show warnings to user
          setTimeout(() => {
            toast.warning(issue);
          }, 0);
        });
      }

      // Create job in Supabase first
      const { data, error: dbError } = await supabase
        .from('litefold-jobs')
        .insert({
          job_id: jobId,
          job_name: formData.name,
          job_desc: formData.description,
          model: formData.selectedModel,
          sequence: formData.inputString, // Store original sequence in DB
          status: 'pending',
          created_at: new Date().toISOString(),
          user_id: user.id
        })
        .select()
        .single();

      if (dbError) {
        console.error('Supabase error:', dbError);
        throw new Error(dbError.message);
      }
      
      // Submit to prediction service with enhanced error handling
      const response = await submitSequenceForPrediction({
        jobId,
        jobName: formData.name,
        model: formData.selectedModel,
        sequence: formData.inputString, // Service will preprocess
        userId: user.id
      });
      
      if (!response.success) {
        // Update job status to error in Supabase
        await supabase
          .from('litefold-jobs')
          .update({
            status: 'error',
            // Store the error message if we have it
            error_message: response.error || 'Unknown error during submission'
          })
          .eq('job_id', jobId);
          
        throw new Error(response.error || 'Unknown error during job submission');
      }

      // Only update store and show toast if everything succeeded
      get().resetFormData();
      get().fetchJobs();
      
      // Use setTimeout to avoid React setState warning
      setTimeout(() => {
        toast.success('Job submitted successfully!');
      }, 0);
    } catch (error) {
      console.error('Error submitting job:', error);
      // Use setTimeout to avoid React setState warning
      setTimeout(() => {
        toast.error(`Failed to submit job: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }, 0);
    }
  },

  fetchJobs: async () => {
    set({ isLoading: true });
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('You must be logged in to view jobs');
      }

      const { data, error } = await supabase
        .from('litefold-jobs')
        .select('*')
        .eq('user_id', user.id)  // Only fetch jobs for current user
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ jobs: data });
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setTimeout(() => {
        toast.error('Failed to fetch jobs');
      }, 0);
    } finally {
      set({ isLoading: false });
    }
  },

  updateJobStatus: async (jobId: string) => {
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('You must be logged in to update job status');
      }

      // Add error handling for fetch
      try {
        // Use apiClient instead of direct fetch with proper type
        interface JobStatusResponse {
          job_id: string;
          status: string;
          completed_at?: string;
          error_message?: string;
        }
        
        // Attempt to get job status
        const data = await apiClient.get<JobStatusResponse>(`jobs/${jobId}/status`);
        
        const { error } = await supabase
          .from('litefold-jobs')
          .update({ 
            status: data.status,
            completed_at: data.completed_at || null,
          })
          .eq('job_id', jobId)
          .eq('user_id', user.id);  // Only update if job belongs to user

        if (error) throw error;

        // Show toast for completed jobs
        if (data.status === 'successful' || data.status === 'crashed') {
          setTimeout(() => {
            if (data.status === 'successful') {
              toast.success(`Job ${jobId} completed successfully!`);
            } else {
              toast.error(`Job ${jobId} failed: ${data.error_message || 'Unknown error'}`);
            }
          }, 0);
        }

        get().fetchJobs();
      } catch (fetchError) {
        console.error('Error fetching job status:', fetchError);
        
        // Check if it's a 404 error (job not found on server)
        if (fetchError instanceof Error && fetchError.message.includes('404')) {
          console.warn(`Job ${jobId} not found on server`);
          
          // Mark job as error state in the database
          await supabase
            .from('litefold-jobs')
            .update({ 
              status: 'error',
            })
            .eq('job_id', jobId)
            .eq('user_id', user.id);
            
          get().fetchJobs();
          return;
        }
        
        // Don't show error toasts for network errors as they can be spammy
        // Just update in the console
        
        // Only update job status to error if it's been in a pending state for a while
        // This helps avoid marking jobs as error just because of temporary network issues
        const { data: jobData } = await supabase
          .from('litefold-jobs')
          .select('status, created_at')
          .eq('job_id', jobId)
          .eq('user_id', user.id)
          .single();
          
        // If job has been pending for more than 10 minutes, mark as error
        if (jobData && jobData.status === 'pending') {
          const createdAt = new Date(jobData.created_at);
          const now = new Date();
          const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
          
          if (diffMinutes > 10) {
            const { error } = await supabase
              .from('litefold-jobs')
              .update({ 
                status: 'error',
              })
              .eq('job_id', jobId)
              .eq('user_id', user.id);
              
            if (!error) {
              get().fetchJobs();
            }
          }
        }
      }
    } catch (error) {
      console.error('Error updating job status:', error);
    }
  },

  deleteJob: async (jobId: string) => {
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('You must be logged in to delete jobs');
      }

      // Call the API to delete the job using apiClient with the correct endpoint
      const response = await apiClient.post<DeleteJobResponse>('jobs/delete', {
        job_id: jobId,
        user_id: user.id
      });

      // Check API response for success
      if (!response.success) {
        throw new Error(response.error_message || 'API deletion failed');
      }

      // Delete job from Supabase after successful API deletion
      const { error: dbError } = await supabase
        .from('litefold-jobs')
        .delete()
        .eq('job_id', jobId)
        .eq('user_id', user.id);  // Only delete if job belongs to user

      if (dbError) throw dbError;

      // Update local state
      set(state => ({
        jobs: state.jobs.filter(job => job.job_id !== jobId)
      }));

      // No toast messages here - they're now handled by the UI component
    } catch (error) {
      console.error('Error deleting job:', error);
      // Don't show error toast here, just throw the error to be caught by the UI
      throw error;
    }
  },
})); 