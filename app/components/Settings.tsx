'use client';

import { useState, useEffect } from 'react';
import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../src/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../src/components/ui/select";
import { Button } from "../../src/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../../src/components/ui/avatar";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "../../src/components/ui/alert";
import { DEFAULT_API_URL, ServerType } from '../../src/lib/config';
import { supabase } from '../../src/lib/supabase';
import { Input } from "../../src/components/ui/input";

// Check if we're running in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

export default function Settings() {
  const [serverType, setServerType] = useState<ServerType>('default');
  const [customUrl, setCustomUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [jobStats, setJobStats] = useState({
    successful: 0,
    processing: 0,
    pending: 0,
    failed: 0
  });

  // Load user data and job statistics
  useEffect(() => {
    const fetchUserAndStats = async () => {
      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // Get job statistics
      if (user) {
        const { data: jobs } = await supabase
          .from('litefold-jobs')
          .select('status')
          .eq('user_id', user.id);

        if (jobs) {
          const stats = {
            successful: 0,
            processing: 0,
            pending: 0,
            failed: 0
          };

          jobs.forEach(job => {
            if (job.status === 'successful') stats.successful++;
            else if (job.status === 'processing') stats.processing++;
            else if (job.status === 'pending') stats.pending++;
            else if (job.status === 'crashed') stats.failed++;
          });

          setJobStats(stats);
        }
      }
    };

    fetchUserAndStats();
  }, []);

  // Load saved settings on component mount
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedServerType = localStorage.getItem('serverType') as ServerType || 'default';
        const savedCustomUrl = localStorage.getItem('savedCustomUrl') || '';
        
        setServerType(savedServerType);
        setCustomUrl(savedCustomUrl);
        setSavedUrl(savedCustomUrl);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, []);

  const validateUrl = (url: string): boolean => {
    try {
      // Clear previous error
      setUrlError('');
      
      // Check for empty URL
      if (!url.trim()) {
        setUrlError('URL cannot be empty');
        return false;
      }
      
      // Basic pattern check - must start with http:// or https://
      if (!url.match(/^https?:\/\//i)) {
        setUrlError('URL must start with http:// or https://');
        return false;
      }
      
      // Try to create URL object to validate
      const urlObj = new URL(url);
      
      // Check for localhost or IP in production (except during development)
      if (!isDevelopment && (urlObj.hostname === 'localhost' || urlObj.hostname.match(/^127\./))) {
        setUrlError('Cannot use localhost URLs');
        return false;
      }
      
      return true;
    } catch (e) {
      setUrlError('Invalid URL format');
      return false;
    }
  };

  const testConnection = async (url: string): Promise<boolean> => {
    setIsCheckingConnection(true);
    setConnectionError('');
    
    try {
      console.log(`Testing connection to: ${url}/health`);
      // Make sure the URL doesn't have trailing slashes
      const cleanUrl = url.trim().replace(/\/+$/, '');
      
      // Try to connect to the API with a simple GET request
      // Adding a query parameter to prevent caching
      const timestamp = new Date().getTime();
      
      try {
        // First attempt with regular CORS mode
        const response = await fetch(`${cleanUrl}/health?t=${timestamp}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          mode: 'cors',
          signal: AbortSignal.timeout(5000)
        });
        
        console.log('Connection test response:', response.status, response.statusText);
        
        if (!response.ok) {
          try {
            const errorData = await response.text();
            console.error('Server response error:', errorData);
          } catch (e) {
            console.error('Could not read error response');
          }
          throw new Error(`Server responded with status: ${response.status}`);
        }
        
        return true;
      } catch (corsError) {
        // If CORS error occurs, we can try a different approach
        if (corsError.message && corsError.message.includes('CORS')) {
          console.log('CORS error detected, trying alternative approach');
          
          // Try using a proxy approach for development
          if (isDevelopment) {
            const proxyUrl = '/api-proxy';
            localStorage.setItem('useProxyForCustom', 'true');
            
            // Save without testing further - the app will use the proxy
            return true;
          }
          
          // For production, inform the user about CORS issues
          throw new Error('CORS policy blocked the request. The server needs to enable CORS for this domain.');
        }
        
        // If it's not a CORS error, re-throw it
        throw corsError;
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setConnectionError(`Connection failed: ${errorMessage}`);
      
      // Revert to default server automatically
      localStorage.setItem('serverType', 'default');
      setServerType('default');
      
      return false;
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const handleSaveUrl = async () => {
    // Reset states
    setSaveSuccess(false);
    setConnectionError('');
    
    try {
      if (serverType === 'default') {
        // Save default server configuration
        localStorage.setItem('serverType', 'default');
        setSavedUrl('');
        setSaveSuccess(true);
      } else {
        // Validate and save custom URL
        if (validateUrl(customUrl)) {
          // Test connection before saving
          const connectionSuccessful = await testConnection(customUrl);
          
          if (connectionSuccessful) {
            // Clean the URL before saving (remove trailing slashes)
            const cleanUrl = customUrl.trim().replace(/\/+$/, '');
            localStorage.setItem('serverType', 'custom');
            localStorage.setItem('savedCustomUrl', cleanUrl);
            setSavedUrl(cleanUrl);
            setSaveSuccess(true);
            
            // Reload the page to apply the new server configuration
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          }
          // If connection failed, the error is shown by testConnection
        }
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setConnectionError(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and application preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* 1. Profile Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Your personal information and account details</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center space-x-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user?.user_metadata?.avatar_url} alt="Avatar" />
                <AvatarFallback>{getInitials(user?.user_metadata?.full_name)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">{user?.user_metadata?.full_name || 'User'}</h3>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </CardContent>
          </Card>

          {/* 2. Job Statistics Card */}
          <Card>
            <CardHeader>
              <CardTitle>Job Statistics</CardTitle>
              <CardDescription>Basic breakdown of your jobs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Successful</p>
                  <p className="text-2xl font-semibold text-green-500">{jobStats.successful}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Processing</p>
                  <p className="text-2xl font-semibold text-blue-500">{jobStats.processing}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-semibold text-yellow-500">{jobStats.pending}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-2xl font-semibold text-red-500">{jobStats.failed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div>
          {/* 3. Server Configuration Card */}
          <Card>
            <CardHeader>
              <CardTitle>Server Configuration</CardTitle>
              <CardDescription>Current server settings and status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Server Info Section */}
              <div className="space-y-4 p-4 bg-muted/30 rounded-md">
                <h3 className="text-sm font-medium">Active Configuration</h3>
                <div>
                  <div className="mb-1 text-sm text-muted-foreground">Server Type</div>
                  <div className="font-medium">{serverType === 'default' ? 'default' : 'custom'}</div>
                </div>
                <div>
                  <div className="mb-1 text-sm text-muted-foreground">Server URL</div>
                  <div className="font-medium">
                    {serverType === 'default' ? 'Default' : (savedUrl || 'Not configured')}
                  </div>
                </div>
              </div>
              
              {/* Configuration Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Change Configuration</h3>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Choose default or custom server</label>
                  <Select
                    value={serverType}
                    onValueChange={(value: ServerType) => {
                      setServerType(value);
                      setSaveSuccess(false);
                      setConnectionError('');
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select server type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="custom">Custom Server</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {serverType === 'custom' && (
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Custom URL</label>
                    <div className="space-y-1">
                      <Input
                        type="url"
                        placeholder="https://your-backend-url.example.com"
                        value={customUrl}
                        onChange={(e) => {
                          setCustomUrl(e.target.value);
                          setSaveSuccess(false);
                          setConnectionError('');
                        }}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the full URL without trailing slashes. Must start with http:// or https://
                      </p>
                    </div>
                    {urlError && <p className="text-xs text-destructive">{urlError}</p>}
                    <Button 
                      onClick={handleSaveUrl} 
                      className="w-full"
                      disabled={isCheckingConnection || !validateUrl(customUrl)}
                    >
                      {isCheckingConnection ? 'Testing Connection...' : 'Save Configuration'}
                    </Button>
                  </div>
                )}
                
                {saveSuccess && (
                  <Alert className="bg-success/10 border-success/30">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <AlertDescription className="text-success">
                      Configuration saved successfully
                    </AlertDescription>
                  </Alert>
                )}
                
                {connectionError && (
                  <Alert className="bg-destructive/10 border-destructive/30">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <AlertDescription className="text-destructive">
                      {connectionError}
                      <div className="mt-1 font-medium">Reverted to default server.</div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 