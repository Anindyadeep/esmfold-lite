import React from 'react';
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useJobsStore } from "@/store/jobsStore";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Info, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import EntityInput from "./EntityInput";

export default function JobForm() {
  const { 
    formData,
    setFormData,
    submitJob,
  } = useJobsStore();

  // Input method state
  const [inputMethod, setInputMethod] = useState<"manual" | "bulk">("manual");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  
  // Entity data for AlphaFold2
  const [entities, setEntities] = useState([]);
  
  // Input validation
  const [inputError, setInputError] = useState<string | null>(null);
  
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

  // FASTA format validation
  const isFastaFormat = (input: string): boolean => {
    return input.trim().startsWith(">");
  };

  // Multimer validation (checks if sequence contains colons which separate chains)
  const isMultimer = (input: string): boolean => {
    return input.includes(":");
  };

  // Handle entities change
  const handleEntitiesChange = (newEntities) => {
    setEntities(newEntities);
    
    // Generate a combined sequence string for submission
    // This is a simplification - you might need more complex logic
    const proteinEntities = newEntities.filter(e => e.type === "protein");
    
    if (proteinEntities.length > 0) {
      const combinedSequence = proteinEntities
        .map(entity => entity.sequence)
        .join(':');
      
      setFormData({ inputString: combinedSequence });
    }
  };

  // Add a debug effect to log when input string changes
  useEffect(() => {
    if (formData.inputString) {
      console.log('Input string updated:', 
        formData.inputString.length > 100 
          ? formData.inputString.substring(0, 100) + '...' 
          : formData.inputString
      );
      console.log('Input contains colons (multimer):', formData.inputString.includes(':'));
    }
  }, [formData.inputString]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login to submit jobs');
      return;
    }
    
    // Handle bulk CSV uploads
    if (inputMethod === "bulk" && formData.inputString && selectedFileName?.toLowerCase().endsWith('.csv')) {
      try {
        // Simple CSV parsing (for a production app, use a proper CSV parser library)
        const lines = formData.inputString.split('\n');
        if (lines.length < 2) {
          toast.error('CSV file must contain at least a header row and one data row');
          return;
        }
        
        const header = lines[0].toLowerCase();
        if (!header.includes('name') || !header.includes('sequence')) {
          toast.error('CSV file must contain "name" and "sequence" columns');
          return;
        }
        
        // For demo purposes, we'll just acknowledge the CSV was processed
        toast.success(
          `Bulk job with ${lines.length - 1} proteins has been submitted! We'll process these sequentially.`,
          {
            duration: 6000,
            icon: "🧬",
          }
        );
        
        // Reset form
        setSelectedFileName(null);
        setFormData({ 
          inputString: '',
          name: '',
          description: ''
        });
        
        return;
      } catch (error) {
        console.error('Error processing CSV:', error);
        toast.error('Error processing CSV file. Please check the format.');
        return;
      }
    }
    
    // Input validation based on model (for non-bulk submissions)
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file extension based on input method and model
    if (inputMethod === "bulk") {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        toast.error('Please upload a .csv file for bulk prediction');
        return;
      }
    } else {
      if (!file.name.toLowerCase().endsWith('.fasta') && !file.name.toLowerCase().endsWith('.txt')) {
        toast.error('Please upload a .fasta or .txt file');
        return;
      }
    }

    setSelectedFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      
      // Handle different file types
      if (file.name.toLowerCase().endsWith('.csv')) {
        // For CSV files (bulk mode), we'll store the raw content and process it on submission
        setInputError(null);
        setFormData({ inputString: content });
      } else {
        // For FASTA/TXT files (standard mode)
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
        
        setInputError(null);
        setFormData({ inputString: content });
      }
    };
    reader.onerror = () => {
      toast.error('Error reading file');
    };
    reader.readAsText(file);
  };

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 flex flex-col">
      <div className="space-y-6 flex-1">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="name" className="text-sm font-medium">Job Name</Label>
            <span className="text-xs text-muted-foreground">A descriptive name</span>
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
            <Label htmlFor="description" className="text-sm font-medium">Job Description</Label>
            <span className="text-xs text-muted-foreground">Optional notes</span>
          </div>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ description: e.target.value })}
            placeholder="e.g., Human insulin protein structure prediction using ESM-3 model for diabetes research"
            className="h-20"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="model" className="text-sm font-medium">Using model</Label>
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
                <SelectItem value="alphafold2">AlphaFold2 <span className="text-xs text-muted-foreground ml-1">(Highly accurate)</span></SelectItem>
                <SelectItem value="esm3">ESM-3 <span className="text-xs text-muted-foreground ml-1">(Fast predictions)</span></SelectItem>
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
                ? "ESM-3 is the fastest model, useful for initial bulk or rough predictions." 
                : formData.selectedModel === "alphafold2" 
                ? "AlphaFold2 is slower but highly accurate, ideal when precision is critical."
                : "Select a model based on your prediction needs."}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Input Method</Label>
            <Tabs value={inputMethod} onValueChange={(v) => setInputMethod(v as "manual" | "bulk")} className="w-full">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="manual">Manual</TabsTrigger>
                <TabsTrigger value="bulk">Bulk</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      <div className="flex-1">
        {/* AlphaFold2 Entity Input */}
        {formData.selectedModel === "alphafold2" && inputMethod === "manual" ? (
          <div className="overflow-visible pr-2">
            <EntityInput onEntitiesChange={handleEntitiesChange} onSubmit={handleSubmit} />
          </div>
        ) : inputMethod === "manual" ? (
          <div className="space-y-2">
            <Textarea
              id="inputString"
              value={formData.inputString}
              onChange={(e) => {
                setFormData({ inputString: e.target.value });
                setInputError(null); // Clear error on change
              }}
              placeholder={formData.selectedModel === "alphafold2" 
                ? "Enter protein sequence in FASTA format (include a header line starting with >)" 
                : "Enter raw protein sequence (without FASTA header)"}
              className={`h-40 min-h-[10rem] ${inputError ? 'border-red-500' : ''}`}
              required={inputMethod === "manual"}
            />
            {inputError && (
              <p className="text-red-500 text-sm">{inputError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              <Info className="inline-block w-4 h-4 mr-1" />
              {formData.selectedModel === "alphafold2" 
                ? "AlphaFold2 requires FASTA format input (starting with '>')"
                : formData.selectedModel === "esm3"
                ? "ESM-3 requires raw sequence input. For multimers, separate chains with colons (:)"
                : "Please enter a valid protein sequence"}
            </p>
          </div>
        ) : (
          <div className="border rounded-md h-auto flex flex-col items-center justify-center text-center p-6 mb-6">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept={inputMethod === "bulk" ? ".csv" : ".fasta,.txt"}
              className="hidden"
            />
            <Upload className="h-8 w-8 mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">
              Upload {inputMethod === "bulk" 
                ? "CSV" 
                : formData.selectedModel === "alphafold2" 
                ? "FASTA" 
                : "Sequence"} File
            </h3>
            
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
                  Drag and drop your {inputMethod === "bulk"
                    ? ".csv"
                    : formData.selectedModel === "alphafold2" 
                    ? ".fasta" 
                    : ".txt"} file here or click to browse
                </p>
                
                {inputMethod === "bulk" && (
                  <div className="mt-2 mb-4 border rounded p-2 bg-muted/20 text-left">
                    <p className="text-xs font-medium mb-1">CSV Format Example:</p>
                    <pre className="text-xs overflow-x-auto whitespace-pre">
                      name,sequence,description<br/>
                      protein1,MDVFMKGLSKAKEGV,Human protein sample<br/>
                      protein2,MTEITAAMVKELREST,Mouse protein sample<br/>
                      protein3,MAAGVKQLADDRTLL,Bacterial protein
                    </pre>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground">
                  <Info className="inline-block w-4 h-4 mr-1" />
                  {inputMethod === "bulk"
                    ? "Upload a CSV file with protein name, sequence, and optional description"
                    : formData.selectedModel === "alphafold2" 
                    ? "AlphaFold2 requires FASTA format input (starting with '>')"
                    : formData.selectedModel === "esm3"
                    ? "ESM-3 requires raw sequence input. For multimers, separate chains with colons (:)"
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

      {/* Submit Job button - fixed position at bottom of the form */}
      {!(formData.selectedModel === "alphafold2" && inputMethod === "manual") && (
        <div className="mt-4">
          <Button type="submit" className="w-full">
            Submit Job
          </Button>
        </div>
      )}
    </form>
  );
} 