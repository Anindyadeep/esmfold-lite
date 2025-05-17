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

  // Initial fetch of jobs - now user-specific
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
    <div className="max-w-7xl mx-auto space-y-8 p-6">
      <Toaster />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-full">
          <h2 className="text-2xl font-bold mb-6">Submit New Job</h2>
          <Card className="p-6 h-[calc(100%-4rem)]">
            <form onSubmit={handleSubmit} className="space-y-6 h-full flex flex-col">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="name">Job Name</Label>
                  <span className="text-xs text-muted-foreground">A descriptive name for this prediction job</span>
                </div>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ name: e.target.value })}
                  placeholder="e.g., Insulin Structure Prediction"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description">Job Description</Label>
                  <span className="text-xs text-muted-foreground">Optional notes about this prediction</span>
                </div>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ description: e.target.value })}
                  placeholder="e.g., Human insulin protein structure prediction using ESM-3 model for diabetes research"
                  className="h-24"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Using model</Label>
                <Select
                  value={formData.selectedModel}
                  onValueChange={(value) => {
                    setFormData({ selectedModel: value });
                    
                    // Validate existing input when model changes
                    if (formData.inputString) {
                      if (value === "alphafold2" && !isFastaFormat(formData.inputString)) {
                        setInputError('AlphaFold2 requires FASTA format input');
                      } else if (value === "esm3" && isFastaFormat(formData.inputString)) {
                        setInputError('ESM-3 requires raw sequence input');
                      } else if (value === "esm3" && isMultimer(formData.inputString)) {
                        setInputError('ESM-3 does not support multimer sequences (with colons)');
                      } else {
                        setInputError(null);
                      }
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alphafold2">AlphaFold2 <span className="text-xs text-muted-foreground ml-1">(Slower but highly accurate)</span></SelectItem>
                    <SelectItem value="esm3">ESM-3 <span className="text-xs text-muted-foreground ml-1">(Fastest, good for initial predictions)</span></SelectItem>
                    <SelectItem value="Chai-1" disabled>
                      Chai-1 (Coming soon)
                    </SelectItem>
                    <SelectItem value="NanoFold" disabled>
                      NanoFold (Coming soon)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground flex items-center mt-1">
                  <Info className="inline-block w-4 h-4 mr-1" />
                  {formData.selectedModel === "esm3" 
                    ? "ESM-3 is the fastest model, useful for initial bulk or rough predictions. Only supports monomers." 
                    : formData.selectedModel === "alphafold2" 
                    ? "AlphaFold2 is slower but highly accurate, ideal when precision is critical."
                    : "Select a model based on your prediction needs."}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="predictionType">Prediction type</Label>
                <Select
                  value="protein"
                  onValueChange={() => {}}
                >
                  <SelectTrigger className="bg-muted/50">
                    <SelectValue placeholder="Select prediction type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="protein">Protein</SelectItem>
                    <SelectItem value="rna" disabled>
                      RNA (Coming soon)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground flex items-center mt-1">
                  <Info className="inline-block w-4 h-4 mr-1" />
                  Currently only protein structure predictions are supported.
                </p>
              </div>

              <div className="space-y-2 flex-grow">
                <div className="flex justify-between items-center">
                  <Label htmlFor="inputString">Input Method</Label>
                  <Tabs value={inputMethod} onValueChange={(v) => setInputMethod(v as "text" | "file")} className="w-auto">
                    <TabsList className="grid grid-cols-2 w-[200px]">
                      <TabsTrigger value="text">Text Input</TabsTrigger>
                      <TabsTrigger value="file">Upload File</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                
                {inputMethod === "text" ? (
                  <div className="space-y-2">
                    <Textarea
                      id="inputString"
                      value={formData.inputString}
                      onChange={(e) => {
                        setFormData({ inputString: e.target.value });
                        setInputError(null); // Clear error on change
                      }}
                      placeholder="Enter protein sequence in FASTA format"
                      className={`h-[calc(100%-5rem)] ${inputError ? 'border-red-500' : ''}`}
                      required={inputMethod === "text"}
                    />
                    {inputError && (
                      <p className="text-red-500 text-sm">{inputError}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      <Info className="inline-block w-4 h-4 mr-1" />
                      {formData.selectedModel === "alphafold2" 
                        ? "AlphaFold2 requires FASTA format input (starting with '>')"
                        : formData.selectedModel === "esm3"
                        ? "ESM-3 requires raw sequence input (without FASTA header) and does not support multimers (no colons)"
                        : "Please enter a valid protein sequence"}
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-md h-[calc(100%-2rem)] flex flex-col items-center justify-center text-center p-6">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".fasta,.txt"
                      className="hidden"
                    />
                    <Upload className="h-8 w-8 mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">Upload FASTA File</h3>
                    
                    {selectedFileName ? (
                      <div className="text-sm mt-2">
                        <Badge variant="outline" className="px-2 py-1">
                          {selectedFileName}
                        </Badge>
                        <p className={`mt-1 ${inputError ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {inputError || 'File loaded successfully'}
                        </p>
                      </div>
                    ) : (
                      <div className="upload-instructions">
                        <p className="text-sm text-muted-foreground mb-4">
                          Drag and drop your .fasta or .txt file here or click to browse
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <Info className="inline-block w-4 h-4 mr-1" />
                          {formData.selectedModel === "alphafold2" 
                            ? "AlphaFold2 requires FASTA format input (starting with '>')"
                            : formData.selectedModel === "esm3"
                            ? "ESM-3 requires raw sequence input (without FASTA header) and does not support multimers (no colons)"
                            : "Please upload a valid protein sequence file"}
                        </p>
                      </div>
                    )}
                    
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleFileUploadClick}
                      className="mt-4"
                    >
                      Choose File
                    </Button>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full">
                Submit Job
              </Button>
            </form>
          </Card>
        </div>

        <div className="h-full">
          <h2 className="text-2xl font-bold mb-6">Protein Input Guide</h2>
          <Card className="p-6 h-[calc(100%-4rem)]">
            <Tabs defaultValue="fasta" className="h-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="fasta">FASTA Format</TabsTrigger>
                <TabsTrigger value="sequence">Sequence</TabsTrigger>
                <TabsTrigger value="pdb">Search from RCSB PDB</TabsTrigger>
              </TabsList>
              
              <TabsContent value="fasta" className="h-[calc(100%-3rem)] overflow-auto">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    FASTA format includes a header line starting with '&gt;' followed by the sequence. <strong>For multimers, separate chains with colons (:)</strong>. The header can include metadata like protein name, ID, and type.
                  </p>
                  
                  <div className="bg-muted/30 p-3 rounded-md">
                    <p className="text-sm font-semibold">Multimer Format Example:</p>
                    <p className="text-xs font-mono whitespace-pre-line">
                      &gt;ProteinName_Complex|PDB_ID
                      SEQUENCEOFCHAINA:SEQUENCEOFCHAINB:SEQUENCEOFCHAINC
                    </p>
                    <p className="text-xs mt-1">
                      The colon character (:) is used to separate different chains in both FASTA format and raw sequence input.
                    </p>
                  </div>
                  
                  {proteinExamples.map((protein, index) => (
                    <div key={index} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{protein.name}</h4>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline">{protein.type}</Badge>
                            <Badge variant="secondary">{protein.difficulty}</Badge>
                            {protein.pdbId && (
                              <a href={`https://www.rcsb.org/structure/${protein.pdbId}`} target="_blank" rel="noopener noreferrer">
                                <Badge variant="outline" className="bg-blue-500/10 hover:bg-blue-500/20 cursor-pointer">
                                  PDB: {protein.pdbId}
                                </Badge>
                              </a>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExampleClick(protein.fasta)}
                        >
                          Use Example
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{protein.description}</p>
                      <div className="text-xs font-mono bg-muted/50 p-2 rounded whitespace-pre-line">
                        {protein.fasta.split('\n')[0]}
                        <br />
                        {protein.fasta.split('\n')[1].slice(0, 47)}...
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="sequence" className="h-[calc(100%-3rem)] overflow-auto">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Raw amino acid sequences using standard single-letter codes. <strong>For multimers, separate chains with colons (:)</strong>. This format is simpler but contains no metadata.
                  </p>
                  
                  <div className="bg-muted/30 p-3 rounded-md">
                    <p className="text-sm font-semibold">Multimer Format Example:</p>
                    <p className="text-xs font-mono">
                      SEQUENCEOFCHAINA:SEQUENCEOFCHAINB:SEQUENCEOFCHAINC
                    </p>
                    <p className="text-xs mt-1">
                      The colon character (:) is used to separate different chains in both FASTA format and raw sequence input.
                    </p>
                  </div>
                  
                  {proteinExamples.map((protein, index) => (
                    <div key={index} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{protein.name}</h4>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline">{protein.type}</Badge>
                            <Badge variant="secondary">{protein.difficulty}</Badge>
                            {protein.pdbId && (
                              <a href={`https://www.rcsb.org/structure/${protein.pdbId}`} target="_blank" rel="noopener noreferrer">
                                <Badge variant="outline" className="bg-blue-500/10 hover:bg-blue-500/20 cursor-pointer">
                                  PDB: {protein.pdbId}
                                </Badge>
                              </a>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExampleClick(protein.sequence)}
                        >
                          Use Example
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{protein.description}</p>
                      <p className="text-xs font-mono bg-muted/50 p-2 rounded truncate">
                        {protein.sequence.includes(':') 
                          ? `${protein.sequence.split(':')[0].slice(0, 30)}... : ${protein.sequence.split(':')[1].slice(0, 30)}...`
                          : `${protein.sequence.slice(0, 50)}...`}
                      </p>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="pdb" className="h-[calc(100%-3rem)] overflow-auto">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="pdbSearch">Search PDB ID or keyword</Label>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        id="pdbSearch"
                        placeholder="e.g. 6VXX or insulin"
                        disabled
                      />
                      <Button variant="outline" disabled>Search</Button>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center mt-2">
                      <Info className="inline-block w-4 h-4 mr-1" />
                      Directly helps you to search protein sequences from PDB
                    </p>
                    <div className="flex justify-center items-center mt-8 text-center">
                      <Badge variant="outline" className="px-4 py-2 text-base">
                        Coming Soon
                      </Badge>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-6">Submitted Jobs</h2>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: itemsPerPage }).map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    </TableRow>
                  ))
                : currentJobs.map((job) => (
                    <TableRow key={job.job_id}>
                      <TableCell className="font-mono">{job.job_id}</TableCell>
                      <TableCell>{job.job_name}</TableCell>
                      <TableCell>{job.model}</TableCell>
                      <TableCell className="max-w-xs truncate">{job.job_desc}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(job.status)} variant="secondary">
                          {job.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(job.created_at)}</TableCell>
                      <TableCell>{job.completed_at ? formatDate(job.completed_at) : '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          {job.status === 'successful' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 p-0 hover:text-primary"
                              onClick={() => downloadJobResults(job.job_id)}
                              title="Download results"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 p-0 hover:text-destructive"
                            onClick={() => {
                              // Create an object with a custom ID to track this toast
                              const toastId = `confirm-delete-${job.job_id}`;
                              
                              toast.custom(
                                (t) => (
                                  <div className="bg-background border rounded-lg shadow-lg p-4 max-w-md mx-auto">
                                    <div className="flex flex-col gap-2">
                                      <div className="font-medium text-base">Confirm Deletion</div>
                                      <div className="text-sm text-muted-foreground">
                                        Are you sure you want to delete job "{job.job_name}"?<br/>
                                        This will remove all data and cannot be undone.
                                      </div>
                                      <div className="flex gap-2 mt-2 justify-end">
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => toast.dismiss(t)}
                                        >
                                          Cancel
                                        </Button>
                                        <Button 
                                          variant="destructive" 
                                          size="sm"
                                          onClick={async () => {
                                            // Dismiss the confirmation toast first
                                            toast.dismiss(t);
                                            
                                            // Use promise-based toast to handle the deletion
                                            toast.promise(
                                              // This is the promise to await
                                              new Promise(async (resolve, reject) => {
                                                try {
                                                  await deleteJob(job.job_id);
                                                  resolve("success");
                                                } catch (err) {
                                                  reject(err);
                                                }
                                              }),
                                              {
                                                loading: `Deleting job ${job.job_name}...`,
                                                success: `Job deleted successfully`,
                                                error: (err) => `Failed to delete job: ${err.message || "Unknown error"}`
                                              }
                                            );
                                          }}
                                        >
                                          Delete Job
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ),
                                { id: toastId, duration: 10000 }
                              );
                            }}
                            title="Delete job"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
          
          {!isLoading && totalPages > 1 && (
            <div className="py-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => paginate(Math.max(1, currentPage - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }).map((_, index) => (
                    <PaginationItem key={index}>
                      <PaginationLink 
                        onClick={() => paginate(index + 1)}
                        isActive={currentPage === index + 1}
                      >
                        {index + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
} 