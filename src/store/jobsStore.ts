import { create } from 'zustand'
import { supabase, LiteFoldJob } from '@/lib/supabase'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'

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
}

const initialFormData: JobFormData = {
  name: "",
  description: "",
  inputString: "",
  selectedModel: "ESMFold",
};

const API_BASE_URL = "https://f4dd-194-105-248-9.ngrok-free.app";

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

      // Submit job to API
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
      
      if (authError || !user) {
        throw new Error('You must be logged in to update job status');
      }

      const response = await fetch(`${API_BASE_URL}/status/${jobId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `Failed to fetch job status: ${response.status}`);
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
    } catch (error) {
      console.error('Error updating job status:', error);
    }
  },
})); 