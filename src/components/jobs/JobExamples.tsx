import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useJobsStore } from "@/store/jobsStore";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Info } from "lucide-react";

// Protein examples data
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

export default function JobExamples() {
  const { formData, setFormData } = useJobsStore();
  
  // FASTA format validation
  const isFastaFormat = (input: string): boolean => {
    return input.trim().startsWith(">");
  };

  const handleExampleClick = (input: string) => {
    // Add debugging logs
    console.log("handleExampleClick called with input:", input);
    console.log("Current model:", formData.selectedModel);
    
    const isFasta = isFastaFormat(input);
    console.log("Is FASTA format:", isFasta);
    
    if (formData.selectedModel === "esm3" && isFasta) {
      // For ESM-3, we need to extract just the sequence part from FASTA
      // But preserve the colons if they exist for multimers
      const sequence = input.split('\n').slice(1).join('');
      console.log("Extracted sequence for ESM-3:", sequence);
      setFormData({ inputString: sequence });
      toast.success('Example applied in raw sequence format for ESM-3 model');
    } else if (formData.selectedModel === "alphafold2" && !isFasta) {
      // For AlphaFold2, we need to add a FASTA header
      const fasta = `>Protein_Sequence\n${input}`;
      console.log("Created FASTA for AlphaFold2:", fasta);
      setFormData({ inputString: fasta });
      toast.success('Example applied in FASTA format for AlphaFold2 model');
    } else {
      // If the format already matches the model's requirements
      console.log("Using input as-is:", input);
      setFormData({ inputString: input });
      toast.success('Example applied');
    }
  };

  const getInputFormatDescription = () => {
    if (formData.selectedModel === "alphafold2") {
      return (
        <p className="text-sm text-muted-foreground">
          FASTA format includes a header line starting with '&gt;' followed by the sequence. <strong>For multimers, separate chains with colons (:)</strong>. The header can include metadata like protein name, ID, and type.
        </p>
      );
    } else {
      return (
        <p className="text-sm text-muted-foreground">
          Raw amino acid sequences using standard single-letter codes. <strong>For multimers, separate chains with colons (:)</strong>. This format is simpler but contains no metadata.
        </p>
      );
    }
  };

  const getMultimerFormatExample = () => {
    if (formData.selectedModel === "alphafold2") {
      return (
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
      );
    } else {
      return (
        <div className="bg-muted/30 p-3 rounded-md">
          <p className="text-sm font-semibold">ESM-3 Format Example:</p>
          <p className="text-xs font-mono">
            SEQUENCEOFCHAINA:SEQUENCEOFCHAINB:SEQUENCEOFCHAINC
          </p>
          <p className="text-xs mt-1">
            The colon character (:) is used to separate different chains when providing multimers.
          </p>
        </div>
      );
    }
  };

  const renderExampleContent = (protein) => {
    if (formData.selectedModel === "alphafold2") {
      return (
        <div className="text-xs font-mono bg-muted/50 p-2 rounded whitespace-pre-line">
          {protein.fasta.split('\n')[0]}
          <br />
          {protein.fasta.split('\n')[1].slice(0, 47)}...
        </div>
      );
    } else {
      return (
        <p className="text-xs font-mono bg-muted/50 p-2 rounded truncate">
          {protein.sequence.includes(':') 
            ? `${protein.sequence.split(':')[0].slice(0, 30)}... : ${protein.sequence.split(':')[1].slice(0, 30)}...`
            : `${protein.sequence.slice(0, 50)}...`}
        </p>
      );
    }
  };

  const getExampleInput = (protein) => {
    // For ESM-3, return the raw sequence
    // For AlphaFold2, return the FASTA format
    if (formData.selectedModel === "alphafold2") {
      return protein.fasta;
    } else {
      // For ESM-3, we return the raw sequence
      return protein.sequence;
    }
  };

  const shouldShowProtein = (protein) => {
    return true; // Show all proteins for all models
  };

  return (
    <div className="h-full">
      <div className="space-y-4 h-full overflow-auto pb-4">
        {getInputFormatDescription()}
        
        {getMultimerFormatExample()}
        
        {proteinExamples.filter(shouldShowProtein).map((protein, index) => (
          <div key={index} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-medium">{protein.name}</h4>
                <div className="flex flex-wrap gap-2 mt-1">
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
                onClick={() => handleExampleClick(getExampleInput(protein))}
                disabled={false}
              >
                Use Example
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{protein.description}</p>
            {renderExampleContent(protein)}
          </div>
        ))}
      </div>
    </div>
  );
} 