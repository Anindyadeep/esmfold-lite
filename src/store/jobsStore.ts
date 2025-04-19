import { create } from 'zustand'
import { supabase, LiteFoldJob } from '@/lib/supabase'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'
import { getApiUrl } from '@/lib/config'

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
}

const initialFormData: JobFormData = {
  name: "",
  description: "",
  inputString: "",
  selectedModel: "ESMFold",
};

export const useJobsStore = create<JobsState>((set, get) => ({
  jobs: [],
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
    const API_BASE_URL = getApiUrl();

    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('You must be logged in to submit a job');
      }

      // Create job in Supabase
      const { data, error: dbError } = await supabase
        .from('litefold-jobs')
        .insert({
          job_id: jobId,
          job_name: formData.name,
          job_desc: formData.description,
          model: formData.selectedModel,
          sequence: formData.inputString,
          status: 'pending',
          created_at: new Date().toISOString(),
          user_id: user.id  // Add user_id to the job
        })
        .select()
        .single();

      if (dbError) {
        console.error('Supabase error:', dbError);
        throw new Error(dbError.message);
      }

      // Submit job to API with CORS handling
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_id: jobId,
          job_name: formData.name,
          model: formData.selectedModel,
          sequence: formData.inputString,
          user_id: user.id  // Add user_id to the API request
        }),
        mode: 'cors',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `API error: ${response.status}`);
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
    }
  },

  updateJobStatus: async (jobId: string) => {
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      const API_BASE_URL = getApiUrl();
      
      if (authError || !user) {
        throw new Error('You must be logged in to update job status');
      }

      // Add error handling for fetch
      try {
        const response = await fetch(`${API_BASE_URL}/status/${jobId}`, {
          method: 'GET',
          mode: 'cors',
          headers: {
            'Accept': 'application/json',
          }
        });
        
        if (!response.ok) {
          // If we get a 404, that likely means the job doesn't exist on the server
          if (response.status === 404) {
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
          
          // For other errors, try to get error details
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Failed to fetch job status: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        
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

      // Delete job from Supabase
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

      // Show success message
      setTimeout(() => {
        toast.success('Job deleted successfully');
      }, 0);
    } catch (error) {
      console.error('Error deleting job:', error);
      setTimeout(() => {
        toast.error(`Failed to delete job: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }, 0);
    }
  },
})); 