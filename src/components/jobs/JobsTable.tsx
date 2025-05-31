import React from 'react';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useJobsStore } from "@/store/jobsStore";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
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

interface JobsTableProps {
  jobs: any[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  paginate: (pageNumber: number) => void;
}

export default function JobsTable({
  jobs,
  isLoading,
  currentPage,
  totalPages,
  itemsPerPage,
  paginate
}: JobsTableProps) {
  const { deleteJob } = useJobsStore();

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'successful':
        return 'bg-green-500/15 text-green-700 hover:bg-green-500/25';
      case 'processing':
        return 'bg-blue-500/15 text-blue-700 hover:bg-blue-500/25';
      case 'error':
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
    <>
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
            : jobs.map((job) => (
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
    </>
  );
} 