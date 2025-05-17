import React, { useState, useEffect } from 'react';

// Valid amino acids single letter codes
// Standard 20 amino acids plus some special characters
const VALID_AA_CHARS = new Set([
  'A', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L',
  'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'V', 'W', 'Y',
  'X', 'B', 'Z', 'J', 'O', 'U', '-'  // X: unknown, B: D or N, Z: E or Q, J/O/U: rare/special
]);

// Constants for sequence length limits
export const MAX_SEQUENCE_LENGTH = 3000;  // AlphaFold2 limit
export const MAX_ESM_SEQUENCE_LENGTH = 1024;  // ESM-3 limit

/**
 * Check if a string is in FASTA format (starts with >)
 */
export function isFastaFormat(input: string): boolean {
  return input.trim().startsWith(">");
}

/**
 * Check if a sequence contains multiple chains (separated by colons)
 */
export function isMultimer(input: string): boolean {
  return input.includes(":");
}

/**
 * Checks if a sequence contains only valid amino acid characters
 */
export function containsValidAminoAcids(sequence: string): boolean {
  // Remove whitespace and convert to uppercase
  const cleanSequence = sequence.replace(/\s/g, '').toUpperCase();
  
  // Check each character
  for (const char of cleanSequence) {
    // Skip the chain separator
    if (char === ':') continue;
    
    if (!VALID_AA_CHARS.has(char)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Extract the actual sequence part from a FASTA format string
 */
export function extractSequenceFromFasta(fastaString: string): string {
  const lines = fastaString.split('\n');
  // Skip header line(s) that start with >
  const sequenceLines = lines.filter(line => !line.startsWith('>'));
  return sequenceLines.join('').replace(/\s/g, '');
}

/**
 * Clean a protein sequence by removing invalid characters
 */
export function cleanProteinSequence(sequence: string): string {
  // Remove whitespace and normalize case
  let cleaned = sequence.replace(/\s/g, '').toUpperCase();
  
  // If it's FASTA format, extract just the sequence part
  if (isFastaFormat(cleaned)) {
    cleaned = extractSequenceFromFasta(sequence);
  }
  
  // Filter out invalid characters but keep chain separators
  return cleaned
    .split(':')
    .map(chain => 
      [...chain].filter(char => VALID_AA_CHARS.has(char)).join('')
    )
    .join(':');
}

/**
 * Check if sequence length is within acceptable limits
 */
export function isSequenceLengthValid(sequence: string, model: string): boolean {
  // Get clean sequence without whitespace
  let cleanSequence = sequence.replace(/\s/g, '');
  
  // If it's FASTA, extract just the sequence part
  if (isFastaFormat(cleanSequence)) {
    cleanSequence = extractSequenceFromFasta(sequence);
  }
  
  // For multimer sequences, count total length of all chains
  const totalLength = cleanSequence.replace(/:/g, '').length;
  
  // Check against model-specific limits
  if (model === 'esm3') {
    return totalLength <= MAX_ESM_SEQUENCE_LENGTH;
  } else {
    // AlphaFold2 or other models
    return totalLength <= MAX_SEQUENCE_LENGTH;
  }
}

/**
 * Validate a protein sequence for submission
 * Returns an error message if invalid, null if valid
 */
export function validateSequenceForSubmission(
  sequence: string, 
  model: string
): string | null {
  if (!sequence || sequence.trim() === '') {
    return 'Sequence cannot be empty';
  }
  
  // Check model-specific format requirements
  if (model === 'alphafold2' && !isFastaFormat(sequence)) {
    return 'AlphaFold2 requires FASTA format input (starting with >)';
  }
  
  if (model === 'esm3' && isFastaFormat(sequence)) {
    return 'ESM-3 requires raw sequence input (without FASTA header)';
  }
  
  if (model === 'esm3' && isMultimer(sequence)) {
    return 'ESM-3 does not support multimer sequences (with colons)';
  }
  
  // Check for valid amino acid characters
  const sequenceToCheck = isFastaFormat(sequence) 
    ? extractSequenceFromFasta(sequence) 
    : sequence;
    
  if (!containsValidAminoAcids(sequenceToCheck)) {
    return 'Sequence contains invalid characters. Please use only standard amino acid codes.';
  }
  
  // Check sequence length
  if (!isSequenceLengthValid(sequence, model)) {
    const limit = model === 'esm3' ? MAX_ESM_SEQUENCE_LENGTH : MAX_SEQUENCE_LENGTH;
    return `Sequence exceeds maximum length of ${limit} amino acids for ${model.toUpperCase()}`;
  }
  
  return null; // Valid sequence
}

/**
 * Prepare a sequence for submission by cleaning and validating it
 * Returns { sequence, error } where error is null if valid
 */
export function prepareSequenceForSubmission(
  inputSequence: string, 
  model: string
): { sequence: string; error: string | null } {
  // First validate the raw input
  const validationError = validateSequenceForSubmission(inputSequence, model);
  if (validationError) {
    return { sequence: inputSequence, error: validationError };
  }
  
  // Clean the sequence (remove any invisible characters, normalize)
  let cleanedSequence = inputSequence.trim();
  
  // For ESM-3, extract sequence from FASTA if needed
  if (model === 'esm3' && isFastaFormat(cleanedSequence)) {
    cleanedSequence = extractSequenceFromFasta(cleanedSequence);
  }
  
  // For AlphaFold2, ensure it's in FASTA format
  if (model === 'alphafold2' && !isFastaFormat(cleanedSequence)) {
    cleanedSequence = `>Protein_Sequence\n${cleanedSequence}`;
  }
  
  return { sequence: cleanedSequence, error: null };
}

interface SequenceValidatorProps {
  sequence: string;
  model: string;
  onValidationResult: (result: { isValid: boolean; message?: string; cleanedSequence?: string }) => void;
}

export function SequenceValidator({ sequence, model, onValidationResult }: SequenceValidatorProps) {
  // Perform validation whenever sequence or model changes
  useEffect(() => {
    if (!sequence) {
      onValidationResult({ isValid: false, message: 'Sequence is empty' });
      return;
    }
    
    const validationError = validateSequenceForSubmission(sequence, model);
    
    if (validationError) {
      onValidationResult({ isValid: false, message: validationError });
      return;
    }
    
    // If valid, prepare the sequence
    const { sequence: cleanedSequence, error } = prepareSequenceForSubmission(sequence, model);
    
    if (error) {
      onValidationResult({ isValid: false, message: error });
      return;
    }
    
    onValidationResult({ isValid: true, cleanedSequence });
  }, [sequence, model, onValidationResult]);
  
  // This is a utility component that doesn't render anything
  return null;
}

export default SequenceValidator; 