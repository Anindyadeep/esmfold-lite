/**
 * Sequence processing and submission service
 */
import { getApiUrl } from './config';
import { apiClient } from './api-client';
import {
  validateSequenceForSubmission,
  prepareSequenceForSubmission,
  cleanProteinSequence
} from '../components/SequenceValidator';

interface SubmitSequenceParams {
  jobId: string;
  jobName: string;
  model: string;
  sequence: string;
  userId: string;
}

interface SequenceSubmissionResponse {
  success: boolean;
  error?: string;
  jobId: string;
  data?: any;
}

/**
 * Submit a sequence for prediction with preprocessing and validation
 */
export async function submitSequenceForPrediction(params: SubmitSequenceParams): Promise<SequenceSubmissionResponse> {
  try {
    const { jobId, jobName, model, sequence, userId } = params;
    
    // Validate the sequence
    const validationError = validateSequenceForSubmission(sequence, model);
    if (validationError) {
      return {
        success: false,
        error: validationError,
        jobId
      };
    }
    
    // Prepare the sequence for submission
    const { sequence: cleanedSequence, error } = prepareSequenceForSubmission(sequence, model);
    if (error) {
      return {
        success: false,
        error,
        jobId
      };
    }
    
    // Log the submission for debugging 
    console.log('Submitting job:', {
      jobId,
      jobName,
      model,
      sequence: `${cleanedSequence.slice(0, 20)}... (${cleanedSequence.length} chars)`,
      userId
    });
    
    // Submit to API using the apiClient
    try {
      const responseData = await apiClient.post('predict', {
        job_id: jobId,
        job_name: jobName,
        model: model,
        sequence: cleanedSequence,
        user_id: userId
      });
      
      return {
        success: true,
        data: responseData,
        jobId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown network error',
        jobId
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      jobId: params.jobId
    };
  }
}

/**
 * Analyze a sequence for potential issues
 */
export function analyzeSequenceQuality(sequence: string): {
  issues: string[];
  hasIssues: boolean;
  cleanedSequence: string;
} {
  const issues: string[] = [];
  
  // Check for common issues
  if (!sequence || sequence.trim() === '') {
    issues.push('Sequence is empty');
    return { issues, hasIssues: issues.length > 0, cleanedSequence: '' };
  }
  
  // 1. Check for non-standard characters
  const cleaned = cleanProteinSequence(sequence);
  if (cleaned !== sequence.replace(/\s/g, '').toUpperCase()) {
    issues.push('Sequence contains non-standard characters that will be removed');
  }
  
  // 2. Check for very long sequences
  if (cleaned.length > 3000) {
    issues.push('Sequence is very long and may exceed model limits');
  }
  
  // 3. Check for unusual patterns suggesting corrupted input
  if (cleaned.includes('\0')) {
    issues.push('Sequence contains null bytes which suggests corrupted data');
  }
  
  // 4. Check for repeated character blocks
  const repeatedChars = /(.)\1{15,}/;
  if (repeatedChars.test(cleaned)) {
    issues.push('Sequence contains unusually long repeats of the same amino acid');
  }
  
  // 5. Check for multimers with extremely imbalanced chains
  if (cleaned.includes(':')) {
    const chains = cleaned.split(':');
    const lengths = chains.map(c => c.length);
    const maxLength = Math.max(...lengths);
    const minLength = Math.min(...lengths);
    
    if (minLength < 10 && maxLength > 100) {
      issues.push('Multimer has very imbalanced chain lengths');
    }
    
    if (chains.length > 4) {
      issues.push('Sequence has more than 4 chains which may not be well-supported');
    }
  }
  
  return {
    issues,
    hasIssues: issues.length > 0,
    cleanedSequence: cleaned
  };
} 