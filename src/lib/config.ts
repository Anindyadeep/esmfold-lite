/**
 * Application configuration
 */

// Default API URL for ESMFold server
export const DEFAULT_API_URL = 'https://largely-accurate-asp.ngrok-free.app';

// Determine if we're in development mode
const isDevelopment = import.meta.env.DEV === true;

/**
 * Get the current API URL based on user preference
 * @returns The API URL to use for requests
 */
export function getApiUrl(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_API_URL;
  }
  
  const serverType = localStorage.getItem('serverType') || 'default';
  
  // In development, use the proxy path to avoid CORS issues
  if (isDevelopment) {
    if (serverType === 'default') {
      return '/api';
    }
    
    // For custom URLs in development, still use the custom URL directly
    // The server owner will need to set up CORS properly
    return localStorage.getItem('savedCustomUrl') || DEFAULT_API_URL;
  }
  
  // In production
  if (serverType === 'default') {
    return DEFAULT_API_URL;
  }
  
  return localStorage.getItem('savedCustomUrl') || DEFAULT_API_URL;
} 