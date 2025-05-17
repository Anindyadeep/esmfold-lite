import React, { useState, useEffect } from 'react';
import { useVisualizeStore } from '@/store/visualizeStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, BarChart2, Beaker, Save } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Textarea } from '@/components/ui/textarea';

interface Structure {
  id: string;
  pdbData: string;
  source: 'file' | 'job' | 'aligned';
  name: string;
  metadata?: {
    distogram?: number[][];
    plddt_score?: number;
    created_at?: string;
    completed_at?: string;
    error_message?: string | null;
    user_id?: string;
    model?: string;
    aligned_pdb_content?: string;
    tm_score?: number;
    rmsd?: number;
  };
}

interface CompareResponse {
  user_id: string;
  experiment_id: string;
  aligned_pdb_content: string;
  aligned_job_id: string;
  tm_score: number;
  rmsd: number;
  success: boolean;
  error_message: string;
}

interface UpdateNoteResponse {
  success: boolean;
  error_message?: string;
}

interface TMScoreComparisionRequest {
  compare_to_job_id: string;
  compare_with_job_id: string | null;
  compare_with_file_name: string | null;
  compare_with_file_content: string | null;
  model: string;
}

// Helper function to properly format job IDs for the API
function formatJobId(id: string): string {
  if (!id) return id;
  
  // Remove 'job-' prefix if present
  if (id.startsWith('job-')) {
    id = id.substring(4);
  }
  
  // Remove the timestamp suffix if present (everything after the UUID)
  // Standard UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  const uuidRegex = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
  const match = id.match(uuidRegex);
  
  if (match && match[1]) {
    return match[1]; // Return just the UUID part
  }
  
  return id;
}

export default function StructureComparison() {
  const { 
    loadedStructures, 
    setCompareStructureIds, 
    setStructureComparison,
    structureComparison,
    updateStructureMetadata,
    setLoadedStructures
  } = useVisualizeStore();
  
  const [structureA, setStructureA] = useState<string>('');
  const [structureB, setStructureB] = useState<string>('');
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [experimentNote, setExperimentNote] = useState<string>('');
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);
  const [cachedExperimentId, setCachedExperimentId] = useState<string | null>(null);
  const [cachedUserId, setCachedUserId] = useState<string | null>(null);
  
  // Reset selections if the number of loaded structures changes
  useEffect(() => {
    if (loadedStructures.length < 2) {
      setStructureA('');
      setStructureB('');
      setCompareStructureIds(null);
      setStructureComparison(null);
    }
  }, [loadedStructures.length, setCompareStructureIds, setStructureComparison]);

  // New effect to maintain structure selections when loadedStructures changes
  // This ensures uploaded PDB files remain selectable after job selection
  useEffect(() => {
    // If we have structure selections but they don't exist in the current loadedStructures,
    // we need to reset them or find replacements
    
    const structureAExists = structureA ? loadedStructures.some(s => s.id === structureA) : false;
    const structureBExists = structureB ? loadedStructures.some(s => s.id === structureB) : false;
    
    // Log the current state for debugging
    console.log('StructureComparison: Checking structure selection validity after loadedStructures change:', {
      loadedStructureCount: loadedStructures.length,
      structureAId: structureA,
      structureBId: structureB,
      structureAExists,
      structureBExists,
    });
    
    // Auto-select first two structures if both are invalid and we have at least 2 structures
    if (loadedStructures.length >= 2 && (!structureAExists && !structureBExists)) {
      // Find all job structures for Structure A
      const jobStructures = loadedStructures.filter(s => s.source === 'job');
      
      // If we have at least one job structure, select it for Structure A
      if (jobStructures.length > 0) {
        const newStructureA = jobStructures[0].id;
        console.log('StructureComparison: Auto-selecting first job for structureA:', newStructureA);
        setStructureA(newStructureA);
        
        // Then find a structure (job or file) for Structure B
        const availableForB = loadedStructures.filter(s => s.id !== newStructureA);
        if (availableForB.length > 0) {
          const newStructureB = availableForB[0].id;
          console.log('StructureComparison: Auto-selecting structure for structureB:', newStructureB);
          setStructureB(newStructureB);
        }
      }
    } 
    // If structureA is invalid but structureB is valid, try to find a new structureA
    else if (!structureAExists && structureBExists) {
      // Find a job structure for Structure A that is not Structure B
      const availableJobs = loadedStructures.filter(
        s => s.source === 'job' && s.id !== structureB
      );
      
      if (availableJobs.length > 0) {
        const newStructureA = availableJobs[0].id;
        console.log('StructureComparison: Auto-selecting new structureA (job):', newStructureA);
        setStructureA(newStructureA);
      }
    } 
    // If structureB is invalid but structureA is valid, try to find a new structureB
    else if (structureAExists && !structureBExists && loadedStructures.length >= 2) {
      // Make sure Structure A is still a job
      const structureAObj = loadedStructures.find(s => s.id === structureA);
      if (structureAObj && structureAObj.source === 'job') {
        // Find a structure for Structure B that is not Structure A
        const newStructureB = loadedStructures.find(s => s.id !== structureA)?.id;
        if (newStructureB) {
          console.log('StructureComparison: Auto-selecting new structureB:', newStructureB);
          setStructureB(newStructureB);
        }
      } else {
        // Structure A is not a job, we need to find a job for Structure A
        const jobStructures = loadedStructures.filter(s => s.source === 'job');
        if (jobStructures.length > 0) {
          const newStructureA = jobStructures[0].id;
          console.log('StructureComparison: Replacing non-job structureA with job:', newStructureA);
          setStructureA(newStructureA);
          
          // Then find a structure (job or file) for Structure B
          const availableForB = loadedStructures.filter(s => s.id !== newStructureA);
          if (availableForB.length > 0) {
            const newStructureB = availableForB[0].id;
            console.log('StructureComparison: Auto-selecting structure for structureB:', newStructureB);
            setStructureB(newStructureB);
          }
        }
      }
    }
    
    // If there are less than 2 structures loaded, keep the reset logic from the other useEffect
  }, [loadedStructures, structureA, structureB]);

  const handleCompare = async () => {
    try {
      // Validate inputs
      if (!structureA || !structureB) {
        throw new Error('Please select both structures to compare');
      }

      // Find the selected structures
      const structureAObj = loadedStructures.find(s => s.id === structureA);
      const structureBObj = loadedStructures.find(s => s.id === structureB);

      if (!structureAObj || !structureBObj) {
        throw new Error('Could not find the selected structures');
      }

      // Ensure Structure A is always a job
      if (structureAObj.source !== 'job') {
        throw new Error('Structure A must be a job');
      }

      // Prepare request data
      const requestData: TMScoreComparisionRequest = {
        compare_to_job_id: '',
        compare_with_job_id: null,
        compare_with_file_name: null,
        compare_with_file_content: null,
        model: 'alphafold2'
      };
      
      // Since Structure A is always a job now, we have two cases:
      // 1. Job-to-job comparison
      // 2. Job-to-file comparison
      if (structureBObj.source === 'job') {
        // Job-to-job comparison
        requestData.compare_to_job_id = formatJobId(structureAObj.id);
        requestData.compare_with_job_id = formatJobId(structureBObj.id);
        requestData.model = structureAObj.metadata?.model || "alphafold2";
      } else if (structureBObj.source === 'file') {
        // Job-to-file comparison
        requestData.compare_to_job_id = formatJobId(structureAObj.id);
        
        // Ensure we have valid PDB data
        if (!structureBObj.pdbData || typeof structureBObj.pdbData !== 'string' || structureBObj.pdbData.length === 0) {
          throw new Error(`No valid PDB data found for structure ${structureBObj.name}`);
        }
        
        requestData.compare_with_file_content = structureBObj.pdbData;
        requestData.model = structureAObj.metadata?.model || "alphafold2";
      }

      console.log('Sending comparison request:', {
        ...requestData,
        compare_with_file_content: requestData.compare_with_file_content ? 
          `PDB data present (${requestData.compare_with_file_content.length} bytes)` : 
          'not present'
      });
      
      // Make API call using the apiClient
      const result = await apiClient.post<CompareResponse>('compare-structures', requestData);
      console.log('Comparison result:', result);

      if (!result.success) {
        throw new Error(result.error_message || 'Unknown error comparing structures');
      }

      // Cache the experiment ID and user ID for later use
      setCachedExperimentId(result.experiment_id);
      setCachedUserId(result.user_id);
      
      // Create a unique ID for the aligned structure
      const alignedStructureId = `aligned-${Date.now()}`;
      
      // Remove any existing aligned structures
      const filteredStructures = loadedStructures.filter(s => !s.id.startsWith('aligned-'));
      
      // Add the new aligned structure
      const alignedStructure: Structure = {
        id: alignedStructureId,
        name: `Aligned: ${structureAObj.name} vs ${structureBObj.name}`,
        source: 'aligned',
        pdbData: result.aligned_pdb_content,
        metadata: {
          aligned_pdb_content: result.aligned_pdb_content,
          model: requestData.model,
          tm_score: result.tm_score,
          rmsd: result.rmsd
        }
      };
      
      setLoadedStructures([...filteredStructures, alignedStructure]);
      
      // Show success message
      toast.success('Structures compared successfully');
      
    } catch (error) {
      console.error('Error comparing structures:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to compare structures');
    }
  };

  // Handle selection changes
  const handleStructureAChange = (value: string) => {
    // Only allow selecting jobs for Structure A
    const structureObj = loadedStructures.find(s => s.id === value);
    if (structureObj && structureObj.source === 'job') {
      setStructureA(value);
      
      // If Structure B is the same as the new Structure A, reset Structure B
      if (value === structureB) {
        setStructureB('');
      }
    } else {
      // This shouldn't happen since we're filtering the dropdown, but just in case
      toast.error('Structure A must be a job');
    }
  };

  const handleStructureBChange = (value: string) => {
    setStructureB(value);
    
    // If Structure A is the same as the new Structure B, we need to find a new job for Structure A
    if (value === structureA) {
      // Find another job to use for Structure A
      const availableJobs = loadedStructures.filter(s => 
        s.source === 'job' && s.id !== value
      );
      
      if (availableJobs.length > 0) {
        setStructureA(availableJobs[0].id);
      } else {
        setStructureA('');
        toast.error('No other job available for Structure A');
      }
    }
  };

  // Get names of structures for display
  const getStructureName = (id: string) => {
    return loadedStructures.find(s => s.id === id)?.name || 'Unknown';
  };

  const handleSaveNote = async () => {
    // Use cached experiment ID from successful comparison
    if (!cachedExperimentId) {
      toast.error('No experiment information available. Please run a comparison first.');
      return;
    }
    
    setIsSavingNote(true);
    
    try {
      const response = await apiClient.post<UpdateNoteResponse>('experiments/note', {
        experiment_id: cachedExperimentId,
        note: experimentNote
      });
      
      if (response.success) {
        toast.success('Observation saved to experiment');
      } else {
        throw new Error(response.error_message || 'Failed to save note');
      }
    } catch (err) {
      console.error('Error saving experiment note:', err);
      toast.error('Failed to save observation');
    } finally {
      setIsSavingNote(false);
    }
  };

  return (
    <div className="space-y-4">
      {loadedStructures.length < 2 ? (
        <div className="text-sm text-muted-foreground text-center py-2">
          Load at least two structures to compare
        </div>
      ) : (
        <div className="comparison-container">
          <div className="grid grid-cols-7 gap-2 items-center">
            <div className="col-span-3">
              <div className="text-xs text-muted-foreground mb-1">Structure A (Job)</div>
              <Select value={structureA} onValueChange={handleStructureAChange}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select job structure" />
                </SelectTrigger>
                <SelectContent>
                  {loadedStructures
                    .filter(structure => structure.source === 'job') // Only show jobs for Structure A
                    .map(structure => (
                      <SelectItem key={structure.id} value={structure.id}>
                        {structure.name}
                        {structure.source === 'job' && ' (job)'}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="col-span-1 flex justify-center">
              <ArrowRight className="text-muted-foreground h-4 w-4" />
            </div>
            
            <div className="col-span-3">
              <div className="text-xs text-muted-foreground mb-1">Structure B (Job or File)</div>
              <Select value={structureB} onValueChange={handleStructureBChange}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select structure to compare" />
                </SelectTrigger>
                <SelectContent>
                  {loadedStructures
                    .filter(structure => structure.id !== structureA) // Don't show already selected Structure A
                    .map(structure => (
                      <SelectItem key={structure.id} value={structure.id}>
                        {structure.name}
                        {structure.source === 'job' && ' (job)'}
                        {structure.source === 'file' && ' (file)'}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            className="w-full" 
            onClick={handleCompare}
            disabled={!structureA || !structureB || isComparing}
            size="sm"
          >
            {isComparing ? (
              <div className="flex items-center">
                <Beaker className="mr-2 h-3 w-3 animate-spin" />
                Comparing...
              </div>
            ) : (
              <div className="flex items-center">
                <BarChart2 className="mr-2 h-3 w-3" />
                Compare Structures
              </div>
            )}
          </Button>

          {error && (
            <div className="text-xs bg-destructive/10 text-destructive p-2 rounded-md">
              <div className="font-medium mb-1">Error:</div>
              <div>{error}</div>
            </div>
          )}

          {infoMessage && !error && (
            <div className="text-xs bg-blue-500/10 text-blue-700 p-2 rounded-md flex items-start">
              <div className="shrink-0 mr-2 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </div>
              <div>{infoMessage}</div>
            </div>
          )}

          {structureComparison && (
            <div className="bg-muted/30 p-3 rounded-md">
              <div className="grid grid-cols-2 gap-3 text-xs mb-2">
                <div>
                  <span className="text-muted-foreground">Structure A:</span>
                  <p className="font-medium truncate">{getStructureName(structureComparison.structureA)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Structure B:</span>
                  <p className="font-medium truncate">{getStructureName(structureComparison.structureB)}</p>
                </div>
              </div>

              <div className="mb-3">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                  Aligned structure is displayed in the viewer
                </Badge>
              </div>

              <div className="space-y-3">
                {/* TM-Score */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-muted-foreground">TM-Score:</span>
                    <span className="text-xs font-medium">
                      {isNaN(structureComparison.tmScore) ? 
                        "Not available" : 
                        structureComparison.tmScore.toFixed(4)
                      }
                    </span>
                  </div>
                  
                  {/* Visual score gauge - only show if we have a valid score */}
                  {!isNaN(structureComparison.tmScore) && (
                    <div className="tm-score-visualization">
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            structureComparison.tmScore > 0.5 ? "bg-green-500" : 
                            structureComparison.tmScore > 0.3 ? "bg-blue-500" : 
                            "bg-yellow-500"
                          }`}
                          style={{ width: `${Math.min(100, structureComparison.tmScore * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>0.0</span>
                        <span>0.5</span>
                        <span>1.0</span>
                      </div>
                      
                      <div className="text-xs text-muted-foreground mt-1">
                        {structureComparison.tmScore > 0.5 ? (
                          "Structures are in the same fold (TM-score > 0.5)"
                        ) : structureComparison.tmScore > 0.3 ? (
                          "Structures have some similarity (0.3 < TM-score < 0.5)"
                        ) : (
                          "Structures are not similar (TM-score < 0.3)"
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* RMSD */}
                {structureComparison.rmsd !== undefined && (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-muted-foreground">RMSD:</span>
                      <span className="text-xs font-medium">
                        {isNaN(structureComparison.rmsd) ? 
                          "Not available" : 
                          structureComparison.rmsd.toFixed(2) + " Å"
                        }
                      </span>
                    </div>
                    
                    {/* Visual score gauge for RMSD */}
                    {!isNaN(structureComparison.rmsd) && (
                      <div className="rmsd-visualization">
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${
                              structureComparison.rmsd < 2 ? "bg-green-500" : 
                              structureComparison.rmsd < 4 ? "bg-blue-500" : 
                              "bg-yellow-500"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, (10 - structureComparison.rmsd) / 10 * 100))}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>Low</span>
                          <span>High</span>
                        </div>
                        
                        <div className="text-xs text-muted-foreground mt-1">
                          {structureComparison.rmsd < 2 ? (
                            "Very similar structures (RMSD < 2Å)"
                          ) : structureComparison.rmsd < 4 ? (
                            "Moderately similar (2Å < RMSD < 4Å)"
                          ) : (
                            "Structures have significant differences (RMSD > 4Å)"
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {structureComparison && (
            <div className="note-section">
              {/* Note input section */}
              <div className="mt-4 space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Experimental Observations</div>
                <Textarea 
                  placeholder="Write any experimental observations here..."
                  className="min-h-24 text-xs"
                  value={experimentNote}
                  onChange={(e) => setExperimentNote(e.target.value)}
                />
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={handleSaveNote}
                  disabled={!experimentNote.trim() || isSavingNote}
                >
                  {isSavingNote ? (
                    <div className="flex items-center">
                      <Beaker className="mr-2 h-3 w-3 animate-spin" />
                      Saving...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Save className="mr-2 h-3 w-3" />
                      Save Note to Experiment
                    </div>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 