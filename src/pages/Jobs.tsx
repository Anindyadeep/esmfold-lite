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
import { Trash2, Upload, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const proteinExamples = [
  {
    name: "Insulin",
    sequence: "MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKT",
    fasta: ">Insulin|monomer|easy\nMALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKT",
    description: "Hormone that regulates blood glucose levels",
    difficulty: "Easy",
    type: "Monomer"
  },
  {
    name: "Green Fluorescent Protein",
    sequence: "MSKGEELFTGVVPILVELDGDVNGHKFSVSGEGEGDATYGKLTLKFICTTGKLPVPWPTLVTTFSYGVQCFSRYPDHMKQHDFFKSAMPEGYVQERTIFFKDDGNYKTRAEVKFEGDTLVNRIELKGIDFKEDGNILGHKLEYNYNSHNVYIMADKQKNGIKVNFKIRHNIEDGSVQLADHYQQNTPIGDGPVLLPDNHYLSTQSALSKDPNEKRDHMVLLEFVTAAGITHGMDELYK",
    fasta: ">GFP|monomer|medium\nMSKGEELFTGVVPILVELDGDVNGHKFSVSGEGEGDATYGKLTLKFICTTGKLPVPWPTLVTTFSYGVQCFSRYPDHMKQHDFFKSAMPEGYVQERTIFFKDDGNYKTRAEVKFEGDTLVNRIELKGIDFKEDGNILGHKLEYNYNSHNVYIMADKQKNGIKVNFKIRHNIEDGSVQLADHYQQNTPIGDGPVLLPDNHYLSTQSALSKDPNEKRDHMVLLEFVTAAGITHGMDELYK",
    description: "Protein that exhibits bright green fluorescence",
    difficulty: "Medium",
    type: "Monomer"
  },
  {
    name: "Hemoglobin Complex",
    sequence: "MVHLTPEEKSAVTALWGKVNVDEVGGEALGRLLVVYPWTQRFFESFGDLSTPDAVMGNPKVKAHGKKVLGAFSDGLAHLDNLKGTFATLSELHCDKLHVDPENFRLLGNVLVCVLAHHFGKEFTPPVQAAYQKVVAGVANALAHKYH:MVHLTPEEKSAVTALWGKVNVDEVGGEALGRLLVVYPWTQRFFESFGDLSTPDAVMGNPKVKAHGKKVLGAFSDGLAHLDNLKGTFATLSELHCDKLHVDPENFRLLGNVLVCVLAHHFGKEFTPPVQAAYQKVVAGVANALAHKYH",
    fasta: ">Hemoglobin_Complex|multimer|difficult\nMVHLTPEEKSAVTALWGKVNVDEVGGEALGRLLVVYPWTQRFFESFGDLSTPDAVMGNPKVKAHGKKVLGAFSDGLAHLDNLKGTFATLSELHCDKLHVDPENFRLLGNVLVCVLAHHFGKEFTPPVQAAYQKVVAGVANALAHKYH:MVHLTPEEKSAVTALWGKVNVDEVGGEALGRLLVVYPWTQRFFESFGDLSTPDAVMGNPKVKAHGKKVLGAFSDGLAHLDNLKGTFATLSELHCDKLHVDPENFRLLGNVLVCVLAHHFGKEFTPPVQAAYQKVVAGVANALAHKYH",
    description: "Tetrameric oxygen-transport protein in red blood cells",
    difficulty: "Difficult",
    type: "Multimer"
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
    await submitJob();
  };

  const handleExampleClick = (input: string) => {
    setFormData({ inputString: input });
    setInputMethod("text");
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
                  onValueChange={(value) => setFormData({ selectedModel: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ESMFold">ESM-3</SelectItem>
                    <SelectItem value="alphafold2" disabled>
                      AlphaFold2 (Coming soon)
                    </SelectItem>
                    <SelectItem value="Chai-1" disabled>
                      Chai-1 (Coming soon)
                    </SelectItem>
                    <SelectItem value="NanoFold" disabled>
                      NanoFold (Coming soon)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="predictionType">Prediction type</Label>
                <Select
                  value="protein"
                  onValueChange={(value) => {}}
                  disabled={true}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select prediction type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="protein">Protein</SelectItem>
                    <SelectItem value="rna" disabled>
                      RNA (Coming soon)
                    </SelectItem>
                  </SelectContent>
                </Select>
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
                  <Textarea
                    id="inputString"
                    value={formData.inputString}
                    onChange={(e) => setFormData({ inputString: e.target.value })}
                    placeholder="Enter protein sequence in FASTA format"
                    className="h-[calc(100%-2rem)]"
                    required={inputMethod === "text"}
                  />
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
                        <p className="text-muted-foreground mt-1">File loaded successfully</p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mb-4">
                        Drag and drop your .fasta file here or click to browse
                      </p>
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
            <Tabs defaultValue="sequence" className="h-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="sequence">Sequence</TabsTrigger>
                <TabsTrigger value="fasta">FASTA Format</TabsTrigger>
              </TabsList>
              
              <TabsContent value="sequence" className="h-[calc(100%-3rem)] overflow-auto">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Raw amino acid sequences using standard single-letter codes. Use colon (:) to separate chains for multimers.
                  </p>
                  
                  {proteinExamples.map((protein, index) => (
                    <div key={index} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{protein.name}</h4>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline">{protein.type}</Badge>
                            <Badge variant="secondary">{protein.difficulty}</Badge>
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
                        {protein.sequence.slice(0, 50)}...
                      </p>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="fasta" className="h-[calc(100%-3rem)] overflow-auto">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    FASTA format includes a header line starting with '&gt;' followed by the sequence. For multimers, use colon (:) to separate chains.
                  </p>
                  
                  {proteinExamples.map((protein, index) => (
                    <div key={index} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{protein.name}</h4>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline">{protein.type}</Badge>
                            <Badge variant="secondary">{protein.difficulty}</Badge>
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
                <TableHead className="w-[50px]">Actions</TableHead>
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
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 p-0 hover:text-destructive"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this job?')) {
                              deleteJob(job.job_id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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