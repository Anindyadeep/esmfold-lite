import { create } from 'zustand'

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
  jobs: Job[];
  formData: JobFormData;
  setJobs: (jobs: Job[]) => void;
  addJob: (job: Job) => void;
  setFormData: (data: Partial<JobFormData>) => void;
  resetFormData: () => void;
}

const initialFormData: JobFormData = {
  name: "",
  description: "",
  inputString: "",
  selectedModel: "ESMFold",
};

export const useJobsStore = create<JobsState>((set) => ({
  jobs: [],
  formData: initialFormData,
  setJobs: (jobs) => set({ jobs }),
  addJob: (job) => set((state) => ({ jobs: [...state.jobs, job] })),
  setFormData: (data) => set((state) => ({ 
    formData: { ...state.formData, ...data } 
  })),
  resetFormData: () => set({ formData: initialFormData }),
})); 