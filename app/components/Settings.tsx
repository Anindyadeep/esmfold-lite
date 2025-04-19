'use client';

import { useState, useEffect } from 'react';
import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "../../src/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../src/components/ui/select";
import { Input } from "../../src/components/ui/input";
import { Button } from "../../src/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../../src/components/ui/avatar";
import { AlertCircle, CheckCircle2, Server, Settings2 } from "lucide-react";
import { Alert, AlertDescription } from "../../src/components/ui/alert";
import { DEFAULT_API_URL, ServerType } from '../../src/lib/config';

export default function Settings() {
  const [serverType, setServerType] = useState<ServerType>('default');
  const [customUrl, setCustomUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);

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
      new URL(url);
      setUrlError('');
      return true;
    } catch (error) {
      setUrlError('Please enter a valid URL with protocol (e.g., https://example.com)');
      return false;
    }
  };

  const testConnection = async (url: string): Promise<boolean> => {
    setIsCheckingConnection(true);
    setConnectionError('');
    
    try {
      // Try to connect to the API with a simple GET request
      // Adding a query parameter to prevent caching
      const timestamp = new Date().getTime();
      const response = await fetch(`${url}/health?t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        // Short timeout to avoid long waiting periods
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      return true;
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
            localStorage.setItem('serverType', 'custom');
            localStorage.setItem('savedCustomUrl', customUrl);
            setSavedUrl(customUrl);
            setSaveSuccess(true);
          }
          // If connection failed, the error is shown and we don't save
        }
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  return (
    <div className="flex flex-col space-y-10">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center space-x-2">
          <Settings2 className="h-6 w-6 text-accent" />
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        </div>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Manage your account and application preferences
        </p>
      </div>

      <div className="grid gap-8">
        {/* Profile Section */}
        <Card className="overflow-hidden border-border/60 hover:border-accent/20 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center space-x-2">
              <span>Profile Information</span>
            </CardTitle>
            <CardDescription>
              Your personal information and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Avatar className="h-20 w-20 border-2 border-accent/20">
              <AvatarImage src="https://github.com/shadcn.png" alt="Profile" />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">JD</AvatarFallback>
            </Avatar>
            <div className="space-y-2 text-center sm:text-left">
              <h3 className="text-xl font-medium">John Doe</h3>
              <p className="text-sm text-muted-foreground">john.doe@example.com</p>
              <div className="flex gap-2 justify-center sm:justify-start">
                <Button variant="outline" size="sm" className="btn-hover-effect">
                  Edit Profile
                </Button>
                <Button variant="secondary" size="sm" className="btn-hover-effect">
                  Change Avatar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Server URL Section */}
        <Card className="overflow-hidden border-border/60 hover:border-accent/20 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center space-x-2">
              <Server className="h-5 w-5 text-accent" />
              <span>Server Configuration</span>
            </CardTitle>
            <CardDescription>
              Configure the ESMFold server connection settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                Server URL
              </label>
              <Select
                value={serverType}
                onValueChange={(value: ServerType) => {
                  setServerType(value);
                  setSaveSuccess(false);
                  setConnectionError('');
                }}
              >
                <SelectTrigger className="w-full input-focus-ring">
                  <SelectValue placeholder="Select server type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default" className="transition-colors hover:bg-accent/10">Default Server</SelectItem>
                  <SelectItem value="custom" className="transition-colors hover:bg-accent/10">Custom Server</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {serverType === 'custom' && (
              <div className="space-y-4 animate-in">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">
                    Custom URL
                  </label>
                  <Input
                    placeholder="Enter custom server URL (e.g., https://example.com)"
                    value={customUrl}
                    onChange={(e) => {
                      setCustomUrl(e.target.value);
                      setSaveSuccess(false);
                      setConnectionError('');
                    }}
                    className="input-focus-ring"
                  />
                  {urlError && (
                    <p className="text-xs text-destructive mt-1">{urlError}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-4 pt-2">
            <Button 
              onClick={handleSaveUrl} 
              className="w-full sm:w-auto btn-hover-effect bg-gradient-to-r from-primary to-accent hover:shadow-sm"
              disabled={isCheckingConnection}
            >
              {isCheckingConnection ? 'Testing Connection...' : 'Save Configuration'}
            </Button>
            
            {saveSuccess && (
              <Alert className="bg-success/10 border-success/30 animate-in">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <AlertDescription className="text-success">
                  Server configuration saved successfully
                </AlertDescription>
              </Alert>
            )}
            
            {connectionError && (
              <Alert className="bg-destructive/10 border-destructive/30 animate-in">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-destructive">
                  {connectionError}
                  <div className="mt-1 font-medium">Reverted to default server.</div>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="w-full rounded-lg border bg-card p-4 glass-effect">
              <h4 className="text-sm font-medium leading-none mb-2">Current Server Configuration</h4>
              <p className="text-sm text-muted-foreground break-all">
                {serverType === 'default' ? 
                  <span>Using default server: <span className="font-medium text-foreground">{DEFAULT_API_URL}</span></span> : 
                  (savedUrl ? <span>Using custom server: <span className="font-medium text-foreground">{savedUrl}</span></span> : 'No custom server configured')}
              </p>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 