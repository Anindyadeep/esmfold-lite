import { getApiUrl } from './config';

/**
 * Common options for all API requests
 */
interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  data?: any;
  timeout?: number;
}

/**
 * Unified API client for making requests to the backend
 */
class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number;
  
  constructor() {
    this.baseUrl = getApiUrl();
    this.defaultTimeout = 30000; // 30 seconds default timeout
  }
  
  /**
   * Create an AbortController with timeout
   */
  private createAbortController(timeoutMs: number): { controller: AbortController; timeoutId: NodeJS.Timeout } {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    return { controller, timeoutId };
  }
  
  /**
   * Make an API request with unified error handling
   */
  public async request<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
    const { 
      method = 'GET', 
      headers = {}, 
      data,
      timeout = this.defaultTimeout 
    } = options;
    
    const { controller, timeoutId } = this.createAbortController(timeout);
    
    try {
      const requestOptions: RequestInit = {
        method,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...headers,
        },
        signal: controller.signal,
      };
      
      if (data) {
        requestOptions.body = JSON.stringify(data);
      }
      
      const url = `${this.baseUrl}/${endpoint.replace(/^\//, '')}`;
      const response = await fetch(url, requestOptions);
      
      // Clear timeout as request completed
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`API error (${response.status}): ${errorText}`);
      }
      
      // Handle empty responses
      if (response.status === 204) {
        return {} as T;
      }
      
      return await response.json() as T;
    } catch (error) {
      // Handle abort errors separately
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      
      // Re-throw other errors
      throw error;
    } finally {
      // Ensure timeout is cleared
      clearTimeout(timeoutId);
    }
  }
  
  /**
   * Convenience methods for common HTTP verbs
   */
  public async get<T>(endpoint: string, options: Omit<ApiRequestOptions, 'method'> = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }
  
  public async post<T>(endpoint: string, data: any, options: Omit<ApiRequestOptions, 'method' | 'data'> = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', data });
  }
  
  public async put<T>(endpoint: string, data: any, options: Omit<ApiRequestOptions, 'method' | 'data'> = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', data });
  }
  
  public async delete<T>(endpoint: string, options: Omit<ApiRequestOptions, 'method'> = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Export a singleton instance
export const apiClient = new ApiClient();

// Common API endpoint types
export interface Job {
  job_id: string;
  job_name: string;
  created_at: string;
  completed_at: string | null;
  result_path: string;
}

export type JobList = Job[]; 