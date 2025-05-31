import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useJobsStore } from "@/store/jobsStore";
import { useEffect, useState, useRef } from "react";
import { Toaster } from "sonner";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Trash2, Upload, Info, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "@/lib/api-client";
import StructurePredict from "@/components/jobs/StructurePredict";
import SearchTab from "@/components/search/SearchTab";
import UploadTab from "@/components/jobs/UploadTab";

// Define the type for the job status response
interface JobStatusResponse {
  job_id: string;
  status: string;
  pdb_content?: string;
  scores?: Record<string, any>;
  input_sequence?: string;
  model: string;
  created_at: string;
  completed_at?: string;
  distogram?: Record<string, any>;
}

const proteinExamples = [
  {
    name: "Insulin",
    sequence: "MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKT",
    fasta: ">Insulin|P01308|monomer\nMALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKT",
    description: "Hormone that regulates blood glucose levels",
    difficulty: "Easy",
    type: "Monomer",
    pdbId: "3I40"
  },
  {
    name: "Green Fluorescent Protein",
    sequence: "MSKGEELFTGVVPILVELDGDVNGHKFSVSGEGEGDATYGKLTLKFICTTGKLPVPWPTLVTTFSYGVQCFSRYPDHMKQHDFFKSAMPEGYVQERTIFFKDDGNYKTRAEVKFEGDTLVNRIELKGIDFKEDGNILGHKLEYNYNSHNVYIMADKQKNGIKVNFKIRHNIEDGSVQLADHYQQNTPIGDGPVLLPDNHYLSTQSALSKDPNEKRDHMVLLEFVTAAGITHGMDELYK",
    fasta: ">GFP|P42212|monomer\nMSKGEELFTGVVPILVELDGDVNGHKFSVSGEGEGDATYGKLTLKFICTTGKLPVPWPTLVTTFSYGVQCFSRYPDHMKQHDFFKSAMPEGYVQERTIFFKDDGNYKTRAEVKFEGDTLVNRIELKGIDFKEDGNILGHKLEYNYNSHNVYIMADKQKNGIKVNFKIRHNIEDGSVQLADHYQQNTPIGDGPVLLPDNHYLSTQSALSKDPNEKRDHMVLLEFVTAAGITHGMDELYK",
    description: "Protein that exhibits bright green fluorescence",
    difficulty: "Medium",
    type: "Monomer",
    pdbId: "1EMA"
  },
  {
    name: "Hemoglobin Complex",
    sequence: "MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLSHGSAQVKGHGKKVADALTNAVAHVDDMPNALSALSDLHAHKLRVDPVNFKLLSHCLLVTLAAHLPAEFTPAVHASLDKFLASVSTVLTSKYR:MVHLTPEEKSAVTALWGKVNVDEVGGEALGRLLVVYPWTQRFFESFGDLSTPDAVMGNPKVKAHGKKVLGAFSDGLAHLDNLKGTFATLSELHCDKLHVDPENFRLLGNVLVCVLAHHFGKEFTPPVQAAYQKVVAGVANALAHKYH:MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLSHGSAQVKGHGKKVADALTNAVAHVDDMPNALSALSDLHAHKLRVDPVNFKLLSHCLLVTLAAHLPAEFTPAVHASLDKFLASVSTVLTSKYR:MVHLTPEEKSAVTALWGKVNVDEVGGEALGRLLVVYPWTQRFFESFGDLSTPDAVMGNPKVKAHGKKVLGAFSDGLAHLDNLKGTFATLSELHCDKLHVDPENFRLLGNVLVCVLAHHFGKEFTPPVQAAYQKVVAGVANALAHKYH",
    fasta: ">Hemoglobin_Complex|tetrameric|1A3N\nMVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLSHGSAQVKGHGKKVADALTNAVAHVDDMPNALSALSDLHAHKLRVDPVNFKLLSHCLLVTLAAHLPAEFTPAVHASLDKFLASVSTVLTSKYR:MVHLTPEEKSAVTALWGKVNVDEVGGEALGRLLVVYPWTQRFFESFGDLSTPDAVMGNPKVKAHGKKVLGAFSDGLAHLDNLKGTFATLSELHCDKLHVDPENFRLLGNVLVCVLAHHFGKEFTPPVQAAYQKVVAGVANALAHKYH:MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLSHGSAQVKGHGKKVADALTNAVAHVDDMPNALSALSDLHAHKLRVDPVNFKLLSHCLLVTLAAHLPAEFTPAVHASLDKFLASVSTVLTSKYR:MVHLTPEEKSAVTALWGKVNVDEVGGEALGRLLVVYPWTQRFFESFGDLSTPDAVMGNPKVKAHGKKVLGAFSDGLAHLDNLKGTFATLSELHCDKLHVDPENFRLLGNVLVCVLAHHFGKEFTPPVQAAYQKVVAGVANALAHKYH",
    description: "Tetrameric oxygen-transport protein in red blood cells (2 alpha and 2 beta chains)",
    difficulty: "Difficult",
    type: "Multimer",
    pdbId: "1A3N"
  }
];

export default function Jobs() {
  const { 
    jobs,
    isLoading,
    formData,
    setFormData,
    submitJob,
    fetchJobs,
    updateJobStatus,
    deleteJob 
  } = useJobsStore();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  // Input method state
  const [inputMethod, setInputMethod] = useState<"text" | "file">("text");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  
  // Input validation
  const [inputError, setInputError] = useState<string | null>(null);
  
  // FASTA format validation
  const isFastaFormat = (input: string): boolean => {
    return input.trim().startsWith(">");
  };

  // Multimer validation (checks if sequence contains colons which separate chains)
  const isMultimer = (input: string): boolean => {
    return input.includes(":");
  };

  // Get the current user's session
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get current user
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  // Initial fetch of jobs - user-specific
  useEffect(() => {
    if (user) {
      fetchJobs();
    }
  }, [fetchJobs, user]);

  // Poll for status updates of pending/processing jobs
  useEffect(() => {
    if (!user) return;

    const pollInterval = setInterval(() => {
      jobs.forEach(job => {
        if (job.status === 'pending' || job.status === 'processing') {
          updateJobStatus(job.job_id);
        }
      });
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(pollInterval);
  }, [jobs, updateJobStatus, user]);

  // Get current jobs
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentJobs = jobs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(jobs.length / itemsPerPage);

  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login to submit jobs');
      return;
    }
    
    // Input validation based on model
    if (formData.selectedModel === "alphafold2" && !isFastaFormat(formData.inputString)) {
      toast.error('AlphaFold2 only supports FASTA format input. Please provide a sequence in FASTA format.');
      setInputError('AlphaFold2 requires FASTA format input');
      return;
    }
    
    if (formData.selectedModel === "esm3" && isFastaFormat(formData.inputString)) {
      toast.error('ESM-3 only supports raw sequence input. Please provide a sequence without FASTA header.');
      setInputError('ESM-3 requires raw sequence input');
      return;
    }
    
    // Check for multimer with ESM3 (ESM3 doesn't support multimers)
    if (formData.selectedModel === "esm3" && isMultimer(formData.inputString)) {
      toast.error('ESM-3 does not support multimers. Please provide a single protein sequence without colons.');
      setInputError('ESM-3 does not support multimer sequences (with colons)');
      return;
    }
    
    // Clear any previous errors
    setInputError(null);
    
    await submitJob();
    
    // Show success notification for successful submission
    toast.success(
      "Your job has been submitted successfully! Protein structure predictions may take some time to complete. We'll notify you when your prediction is ready.",
      {
        duration: 6000, // Show for 6 seconds
        icon: "🧬",
      }
    );
  };

  const handleExampleClick = (input: string) => {
    const isFasta = isFastaFormat(input);
    
    if (formData.selectedModel === "esm3" && isFasta) {
      toast.warning('Converting FASTA to raw sequence for ESM-3 model');
      // Extract just the sequence part from FASTA
      const sequence = input.split('\n').slice(1).join('');
      setFormData({ inputString: sequence });
    } else if (formData.selectedModel === "alphafold2" && !isFasta) {
      toast.warning('Converting raw sequence to FASTA format for AlphaFold2 model');
      // Create a simple FASTA header
      const fasta = `>Protein_Sequence\n${input}`;
      setFormData({ inputString: fasta });
    } else {
      setFormData({ inputString: input });
    }
    
    setInputMethod("text");
    setInputError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.fasta') && !file.name.toLowerCase().endsWith('.txt')) {
      toast.error('Please upload a .fasta or .txt file');
      return;
    }

    setSelectedFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      
      // Validate file content based on model
      if (formData.selectedModel === "esm3" && isFastaFormat(content)) {
        toast.error('ESM-3 only supports raw sequence input. Please provide a sequence without FASTA header.');
        setInputError('ESM-3 requires raw sequence input');
        return;
      }
      
      if (formData.selectedModel === "alphafold2" && !isFastaFormat(content)) {
        toast.error('AlphaFold2 only supports FASTA format input. Please provide a sequence in FASTA format.');
        setInputError('AlphaFold2 requires FASTA format input');
        return;
      }
      
      // Check for multimer with ESM3
      if (formData.selectedModel === "esm3" && isMultimer(content)) {
        toast.error('ESM-3 does not support multimers. Please provide a single protein sequence without colons.');
        setInputError('ESM-3 does not support multimer sequences (with colons)');
        return;
      }
      
      setInputError(null);
      setFormData({ inputString: content });
    };
    reader.onerror = () => {
      toast.error('Error reading file');
    };
    reader.readAsText(file);
  };

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'successful':
        return 'bg-green-500/15 text-green-700 hover:bg-green-500/25';
      case 'processing':
        return 'bg-blue-500/15 text-blue-700 hover:bg-blue-500/25';
      case 'crashed':
        return 'bg-red-500/15 text-red-700 hover:bg-red-500/25';
      case 'pending':
        return 'bg-yellow-500/15 text-yellow-700 hover:bg-yellow-500/25';
      default:
        return '';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const downloadJobResults = async (jobId: string) => {
    try {
      toast.loading(`Preparing download for job ${jobId}...`);
      
      // Get current job info from jobs state first
      const jobInfo = jobs.find(job => job.job_id === jobId);
      
      if (!jobInfo) {
        throw new Error("Job not found in current list");
      }
      
      // Call the status endpoint using apiClient
      let data: JobStatusResponse;
      try {
        data = await apiClient.get<JobStatusResponse>(`jobs/${jobId}/status`);
        console.log("API Response:", data); // Log the response for debugging
      } catch (error) {
        console.warn("Could not fetch detailed status data, using basic job info", error);
        // Use basic job info if API call fails
        data = {
          job_id: jobInfo.job_id,
          status: jobInfo.status,
          model: jobInfo.model,
          created_at: jobInfo.created_at,
          completed_at: jobInfo.completed_at,
        };
      }
      
      // Create a zip file with the results
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      // Add PDB file if available
      if (data.pdb_content) {
        zip.file(`${jobInfo.job_name}.pdb`, data.pdb_content);
      }
      
      // Add distogram if available
      if (data.distogram) {
        zip.file(`${jobInfo.job_name}_distogram.json`, JSON.stringify(data.distogram));
      }
      
      // Generate and download the zip file
      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${jobInfo.job_name}_results.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Download complete');
    } catch (error) {
      console.error('Error downloading job results:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to download job results');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 pt-2">
      <Toaster />
      
      <div>
        <Tabs defaultValue="structurePredict" className="w-full">
          <TabsList className="w-full border-b bg-transparent h-auto p-0 mb-4">
            <div className="flex">
              <TabsTrigger 
                value="search" 
                className="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Search
              </TabsTrigger>
              <TabsTrigger 
                value="structurePredict" 
                className="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Structure Predict
              </TabsTrigger>
              <TabsTrigger 
                value="interactions" 
                className="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Interactions
              </TabsTrigger>
              <TabsTrigger 
                value="denovo" 
                className="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <i>De Novo</i>
              </TabsTrigger>
              <TabsTrigger 
                value="upload" 
                className="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Upload
              </TabsTrigger>
              </div>
                    </TabsList>
          
          <TabsContent value="upload" className="mt-6">
            <Card>
              <UploadTab onSubmit={(data) => {
                console.log("Upload data:", data);
                toast.success(`Sequence "${data.name || data.fileName}" saved successfully`);
              }} />
            </Card>
          </TabsContent>
              
          <TabsContent value="search" className="mt-6">
            <SearchTab />
          </TabsContent>
          
          <TabsContent value="denovo" className="mt-6">
            <div className="h-[80vh] flex items-center justify-center text-center bg-muted/10 rounded-lg">
              <div>
                <h3 className="text-xl font-medium mb-2"><i>De Novo</i> Design</h3>
                <p className="text-muted-foreground">This section is under development</p>
                  </div>
                </div>
              </TabsContent>
          
          <TabsContent value="structurePredict" className="mt-6">
            <StructurePredict />
          </TabsContent>
          
          <TabsContent value="interactions" className="mt-6">
            <div className="h-[80vh] flex items-center justify-center text-center bg-muted/10 rounded-lg">
              <div>
                <h3 className="text-xl font-medium mb-2">Interactions Tab</h3>
                <p className="text-muted-foreground">This section is under development</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 