/**
 * Application configuration
 */

// Default API URL for ESMFold server
// This will be set via vite.config.ts define
export const DEFAULT_API_URL = import.meta.env.DEFAULT_BACKEND_URL || 'https://litefold-production.up.railway.app';

// Determine if we're in development mode
const isDevelopment = typeof import.meta.env !== 'undefined' && import.meta.env.DEV === true;

// Server type options
export type ServerType = 'default' | 'custom';

/**
 * Safely get an item from localStorage with fallback
 */
const getLocalStorageItem = (key: string, fallback: string): string => {
  if (typeof window === 'undefined') {
    return fallback;
  }
  
  try {
    const value = localStorage.getItem(key);
    return value || fallback;
  } catch (error) {
    console.error(`Error accessing localStorage for key ${key}:`, error);
    return fallback;
  }
};

/**
 * Get the current API URL based on user preference
 * @returns The API URL to use for requests
 */
export function getApiUrl(): string {
  // Handle server-side rendering case
  if (typeof window === 'undefined') {
    return DEFAULT_API_URL;
  }
  
  try {
    const serverType = getLocalStorageItem('serverType', 'default') as ServerType;
    
    // In development, use the proxy path to avoid CORS issues
    if (isDevelopment) {
      if (serverType === 'default') {
        return '/api';
      }
      
      // For custom URLs in development, check if we need to use the proxy
      const useProxy = getLocalStorageItem('useProxyForCustom', 'false') === 'true';
      const customUrl = getLocalStorageItem('savedCustomUrl', DEFAULT_API_URL);
      
      if (useProxy) {
        // Use a different proxy path for custom servers
        console.log('Using API proxy for custom server');
        return '/api-proxy';
      }
      
      // Use custom URL directly if no proxy needed
      return customUrl;
    }
    
    // In production
    if (serverType === 'default') {
      return DEFAULT_API_URL;
    }
    
    const customUrl = getLocalStorageItem('savedCustomUrl', DEFAULT_API_URL);
    
    // Basic URL validation
    try {
      new URL(customUrl);
      return customUrl;
    } catch (e) {
      console.error('Invalid custom URL:', customUrl);
      return DEFAULT_API_URL;
    }
  } catch (error) {
    // Fallback to default API URL if there's any error
    console.error('Error getting API URL:', error);
    return DEFAULT_API_URL;
  }
} 