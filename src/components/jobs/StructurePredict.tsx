import { useJobsStore } from "@/store/jobsStore";
import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Import sub-components that we'll create next
import JobForm from "./JobForm";
import JobExamples from "./JobExamples";
import JobsTable from "./JobsTable";

export default function StructurePredict() {
  const { jobs, isLoading, fetchJobs, updateJobStatus } = useJobsStore();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  
  // View state - either "launchpad" or "jobs"
  const [activeView, setActiveView] = useState("launchpad");

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

  return (
    <div className="space-y-6">
      {/* Main Navigation Tabs */}
      <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Structure Prediction</h2>
          <TabsList className="grid w-[400px] grid-cols-2">
            <TabsTrigger value="launchpad">Launch New Job</TabsTrigger>
            <TabsTrigger value="jobs">View Submitted Jobs</TabsTrigger>
          </TabsList>
        </div>
        
        {/* Launchpad View */}
        <TabsContent value="launchpad" className="m-0">
          <Card className="relative">
            <div className="grid grid-cols-12">
              {/* Job Form Section (takes 8/12 width) */}
              <div className="col-span-12 lg:col-span-8 p-6 border-r">
                <h3 className="text-xl font-semibold mb-4">Submit a Structure Prediction Job</h3>
                <JobForm />
              </div>
              
              {/* Protein Guide Section (takes 4/12 width) */}
              <div className="col-span-12 lg:col-span-4 p-6 bg-muted/10">
                <h3 className="text-xl font-semibold mb-4">Input Guide</h3>
                <JobExamples />
              </div>
            </div>
          </Card>
        </TabsContent>
        
        {/* Jobs View */}
        <TabsContent value="jobs" className="m-0">
          <Card>
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4">Your Structure Prediction Jobs</h3>
              <JobsTable 
                jobs={currentJobs}
                isLoading={isLoading}
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                paginate={paginate}
              />
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 