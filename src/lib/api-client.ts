import { getApiUrl } from './config';
import { supabase } from './supabase';

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
  private isUsingProxy: boolean;
  private customServerUrl: string | null;
  
  constructor() {
    this.baseUrl = getApiUrl();
    this.defaultTimeout = 30000; // 30 seconds default timeout
    
    // Check if we're using the proxy for custom server
    const isDevelopment = process.env.NODE_ENV === 'development';
    this.isUsingProxy = isDevelopment && this.baseUrl === '/api-proxy';
    
    // Store the actual custom URL if we're using the proxy
    this.customServerUrl = this.isUsingProxy ? 
      (typeof localStorage !== 'undefined' ? localStorage.getItem('savedCustomUrl') : null) : 
      null;
    
    console.log('API Client initialized with:', {
      baseUrl: this.baseUrl,
      isUsingProxy: this.isUsingProxy,
      customServerUrl: this.customServerUrl
    });
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
   * Get the API key for authentication
   */
  private getApiKey(): string {
    // Use fixed API key from FastAPI documentation
    return "DPYPGUkpKiKLGBdluIh3nc8DiNt6krEzjvCjDY-Zoqw";
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
      // Get API key
      const apiKey = this.getApiKey();
      
      // Add custom server URL as header when using proxy
      const customHeaders = { ...headers };
      if (this.isUsingProxy && this.customServerUrl) {
        customHeaders['X-Target-URL'] = this.customServerUrl;
      }
      
      const requestOptions: RequestInit = {
        method,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          ...customHeaders,
        },
        signal: controller.signal,
      };
      
      // Enable credentials for CORS requests
      requestOptions.credentials = 'include';
      
      if (data) {
        requestOptions.body = JSON.stringify(data);
      }
      
      const url = `${this.baseUrl}/${endpoint.replace(/^\//, '')}`;
      
      console.log(`Making API request to ${url}`);
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