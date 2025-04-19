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

interface Job {
  id: string;
  name: string;
  description: string;
  status: 'completed' | 'running' | 'failed' | 'queued';
  submittedAt: string;
  completedAt?: string;
}

const mockJobs: Job[] = [
  {
    id: "job_123",
    name: "Protein Structure Analysis",
    description: "Analysis of protein folding patterns",
    status: "completed",
    submittedAt: "2024-03-20T10:30:00Z",
    completedAt: "2024-03-20T10:35:00Z",
  },
  {
    id: "job_124",
    name: "Molecular Dynamics",
    description: "Simulation of molecular interactions",
    status: "running",
    submittedAt: "2024-03-20T11:00:00Z",
  },
  {
    id: "job_125",
    name: "Structure Prediction",
    description: "Predicting protein secondary structure",
    status: "queued",
    submittedAt: "2024-03-20T11:15:00Z",
  },
  {
    id: "job_126",
    name: "Failed Analysis",
    description: "Example of a failed job",
    status: "failed",
    submittedAt: "2024-03-20T09:00:00Z",
    completedAt: "2024-03-20T09:02:00Z",
  },
];

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
  const { jobs, formData, setFormData, addJob, resetFormData } = useJobsStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newJob = {
      id: `job_${Date.now()}`,
      name: formData.name,
      description: formData.description,
      status: 'queued' as const,
      submittedAt: new Date().toISOString(),
    };
    addJob(newJob);
    resetFormData();
  };

  const handleExampleClick = (sequence: string) => {
    setFormData({ inputString: sequence });
  };

  const getStatusBadgeColor = (status: Job['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/15 text-green-700 hover:bg-green-500/25';
      case 'running':
        return 'bg-blue-500/15 text-blue-700 hover:bg-blue-500/25';
      case 'failed':
        return 'bg-red-500/15 text-red-700 hover:bg-red-500/25';
      case 'queued':
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
                    <SelectItem value="ESMFold">ESMFold</SelectItem>
                    <SelectItem value="Proteinx" disabled>
                      Proteinx (Coming soon)
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
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Completed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-mono">{job.id}</TableCell>
                  <TableCell>{job.name}</TableCell>
                  <TableCell className="max-w-xs truncate">{job.description}</TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeColor(job.status)} variant="secondary">
                      {job.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(job.submittedAt)}</TableCell>
                  <TableCell>{job.completedAt ? formatDate(job.completedAt) : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
} 