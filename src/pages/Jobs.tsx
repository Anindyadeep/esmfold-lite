import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useJobsStore } from "@/store/jobsStore";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

const proteinExamples = [
  {
    name: "Human Hemoglobin",
    sequence: "MVHLTPEEKSAVTALWGKVNVDEVGGEALGRLLVVYPWTQRFFESFGDLSTPDAVMGNPKVKAHGKKVLGAFSDGLAHLDNLKGTFATLSELHCDKLHVDPENFRLLGNVLVCVLAHHFGKEFTPPVQAAYQKVVAGVANALAHKYH",
    description: "Oxygen-transport protein found in red blood cells"
  },
  {
    name: "Insulin",
    sequence: "MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKT",
    description: "Hormone that regulates blood glucose levels"
  },
  {
    name: "Green Fluorescent Protein",
    sequence: "MSKGEELFTGVVPILVELDGDVNGHKFSVSGEGEGDATYGKLTLKFICTTGKLPVPWPTLVTTFSYGVQCFSRYPDHMKQHDFFKSAMPEGYVQERTIFFKDDGNYKTRAEVKFEGDTLVNRIELKGIDFKEDGNILGHKLEYNYNSHNVYIMADKQKNGIKVNFKIRHNIEDGSVQLADHYQQNTPIGDGPVLLPDNHYLSTQSALSKDPNEKRDHMVLLEFVTAAGITHGMDELYK",
    description: "Protein that exhibits bright green fluorescence"
  }
];

export default function Jobs() {
  const { 
    jobs, 
    formData, 
    setFormData, 
    submitJob, 
    fetchJobs,
    updateJobStatus,
    deleteJob 
  } = useJobsStore();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login to submit jobs');
      return;
    }
    await submitJob();
  };

  const handleExampleClick = (sequence: string) => {
    setFormData({ inputString: sequence });
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
                <Label htmlFor="name">Job Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ name: e.target.value })}
                  placeholder="Enter job name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Job Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ description: e.target.value })}
                  placeholder="Enter job description"
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

              <div className="space-y-2 flex-grow">
                <Label htmlFor="inputString">Input String</Label>
                <Textarea
                  id="inputString"
                  value={formData.inputString}
                  onChange={(e) => setFormData({ inputString: e.target.value })}
                  placeholder="Enter protein sequence in FASTA format"
                  className="h-[calc(100%-2rem)]"
                  required
                />
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
            <div className="space-y-6 h-full">
              <div>
                <h3 className="font-semibold text-lg mb-3">Example Proteins</h3>
                <div className="space-y-4">
                  {proteinExamples.map((protein, index) => (
                    <div key={index} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{protein.name}</h4>
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
              </div>
            </div>
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
              {jobs.map((job) => (
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
        </Card>
      </div>
    </div>
  );
} 