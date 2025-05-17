import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "../lib/auth";

interface Experiment {
  experiment_id: string;
  experiment_type: string;
  compare_to_job_id: string;
  compare_with_job_id: string;
  compare_with_file_name: string;
  model: string;
  compare_to_sequence: string;
  compare_with_sequence: string;
  tm_score: number | null;
  rmsd: number | null;
  success: boolean;
  created_at: string;
  notes: string;
}

export default function Experiments() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    const fetchExperiments = async () => {
      // Don't fetch until auth is done loading
      if (authLoading) return;
      
      try {
        setIsLoading(true);
        
        // Fetch experiments from the API using the correct endpoint
        const data = await apiClient.get<Experiment[]>('experiments');
        setExperiments(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching experiments:', err);
        setError('Failed to load experiments');
      } finally {
        setIsLoading(false);
      }
    };

    fetchExperiments();
  }, [authLoading]);

  // Format date to a more readable format
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format number with fallback for null values
  const formatNumber = (value: number | null, decimals: number = 4) => {
    return value !== null ? value.toFixed(decimals) : 'N/A';
  };
  
  // Format sequence to show only first 10 characters with ellipsis if longer
  const formatSequence = (sequence: string) => {
    if (!sequence) return '-';
    return sequence.length > 10 ? `${sequence.substring(0, 10)}...` : sequence;
  };
  
  // Toggle expanded row
  const toggleRowExpansion = (id: string) => {
    setExpandedRow(prevId => prevId === id ? null : id);
  };
  
  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = experiments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(experiments.length / itemsPerPage);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Experiments</h1>
        <p className="text-muted-foreground mt-1">
          View and analyze experiment results
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comparision Results</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="text-center text-red-500 p-4">{error}</div>
          ) : experiments.length === 0 ? (
            <div className="text-center text-muted-foreground p-4">No experiments found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Compare IDs</TableHead>
                      <TableHead>TM Score</TableHead>
                      <TableHead>RMSD</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentItems.map((experiment) => (
                      <React.Fragment key={experiment.experiment_id}>
                        <TableRow 
                          onClick={() => toggleRowExpansion(experiment.experiment_id)}
                          className="cursor-pointer hover:bg-muted/50"
                        >
                          <TableCell>
                            {expandedRow === experiment.experiment_id ? 
                              <ChevronUp className="h-4 w-4" /> : 
                              <ChevronDown className="h-4 w-4" />
                            }
                          </TableCell>
                          <TableCell className="font-medium">{experiment.model}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-xs text-muted-foreground">To: {experiment.compare_to_job_id || '-'}</span>
                              <span className="text-xs text-muted-foreground">With: {experiment.compare_with_job_id || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell>{formatNumber(experiment.tm_score)}</TableCell>
                          <TableCell>{formatNumber(experiment.rmsd)}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              experiment.success 
                                ? 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400' 
                                : 'bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400'
                            }`}>
                              {experiment.success ? 'Success' : 'Failed'}
                            </span>
                          </TableCell>
                          <TableCell>{formatDate(experiment.created_at)}</TableCell>
                        </TableRow>
                        
                        {/* Expanded row with additional details */}
                        {expandedRow === experiment.experiment_id && (
                          <TableRow className="bg-muted/10">
                            <TableCell colSpan={7} className="p-4">
                              <div className="space-y-6">
                                {/* Header with type and ID */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="bg-muted px-2 py-0.5 text-sm rounded-md">
                                      {experiment.experiment_type || 'comparison'}
                                    </span>
                                    <span className="text-sm text-muted-foreground">ID: {experiment.experiment_id}</span>
                                  </div>
                                  <div>
                                    <span className={`px-2 py-0.5 rounded-md text-xs ${
                                      experiment.success 
                                        ? 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400' 
                                        : 'bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400'
                                    }`}>
                                      {experiment.success ? 'Success' : 'Failed'}
                                    </span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Left column */}
                                  <div className="bg-card border rounded-md p-4">
                                    <h4 className="text-sm font-medium mb-4">• Experiment Details</h4>
                                    <div className="space-y-3 text-sm">
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="text-muted-foreground">Model:</div>
                                        <div>{experiment.model}</div>
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="text-muted-foreground">File Name:</div>
                                        <div>{experiment.compare_with_file_name || '-'}</div>
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="text-muted-foreground">Compare To ID:</div>
                                        <div>{experiment.compare_to_job_id || '-'}</div>
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="text-muted-foreground">Compare With ID:</div>
                                        <div>{experiment.compare_with_job_id || '-'}</div>
                                      </div>
                                    </div>

                                    <h4 className="text-sm font-medium mt-6 mb-4">• Results</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="bg-muted rounded-md p-3">
                                        <div className="text-muted-foreground text-xs mb-1">TM Score</div>
                                        <div className="text-xl">{formatNumber(experiment.tm_score)}</div>
                                      </div>
                                      <div className="bg-muted rounded-md p-3">
                                        <div className="text-muted-foreground text-xs mb-1">RMSD</div>
                                        <div className="text-xl">{formatNumber(experiment.rmsd)}</div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Right column */}
                                  <div className="bg-card border rounded-md p-4">
                                    <h4 className="text-sm font-medium mb-4">• Sequences</h4>
                                    
                                    <div className="space-y-4">
                                      <div>
                                        <div className="flex justify-between items-center mb-2">
                                          <div className="text-muted-foreground text-sm">Compare To Sequence:</div>
                                          <div className="text-xs bg-muted px-2 py-0.5 rounded">
                                            {experiment.compare_to_sequence?.length || 0} residues
                                          </div>
                                        </div>
                                        <div className="font-mono text-xs bg-muted p-2 rounded overflow-x-auto whitespace-nowrap max-h-16">
                                          {experiment.compare_to_sequence || '-'}
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <div className="flex justify-between items-center mb-2">
                                          <div className="text-muted-foreground text-sm">Compare With Sequence:</div>
                                          <div className="text-xs bg-muted px-2 py-0.5 rounded">
                                            {experiment.compare_with_sequence?.length || 0} residues
                                          </div>
                                        </div>
                                        <div className="font-mono text-xs bg-muted p-2 rounded overflow-x-auto whitespace-nowrap max-h-16">
                                          {experiment.compare_with_sequence || '-'}
                                        </div>
                                      </div>
                                    </div>

                                    {experiment.notes && (
                                      <div className="notes-section">
                                        <h4 className="text-sm font-medium mt-6 mb-4">• Notes</h4>
                                        <div className="text-sm bg-muted p-2 rounded">
                                          {experiment.notes}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex justify-end">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedRow(null);
                                    }}
                                  >
                                    Close Details
                                  </Button>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              <div className="flex items-center justify-between space-x-2 py-4">
                <div className="text-sm text-muted-foreground">
                  Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, experiments.length)} of {experiments.length} results
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  {Array.from({ length: Math.min(totalPages, 5) }).map((_, index) => {
                    const pageNumber = index + 1;
                    return (
                      <Button
                        key={pageNumber}
                        variant={currentPage === pageNumber ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNumber)}
                        className="h-8 w-8 p-0"
                      >
                        {pageNumber}
                      </Button>
                    );
                  })}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 