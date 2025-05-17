"use client";

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { useJobsStore } from "@/store/jobsStore";
import { useMemo } from 'react';
import { DEFAULT_API_URL } from "@/lib/config";
import { apiClient } from "@/lib/api-client";

// Use the default server URL from the config
const DEFAULT_SERVER_URL = DEFAULT_API_URL;

export default function Settings() {
  const [serverType, setServerType] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('serverType') || 'default';
    }
    return 'default';
  });
  
  const [customUrl, setCustomUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('customUrl') || '';
    }
    return '';
  });

  const [activeServerUrl, setActiveServerUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      const type = localStorage.getItem('serverType') || 'default';
      return type === 'default' ? 'Default' : localStorage.getItem('savedCustomUrl') || '';
    }
    return 'Default';
  });

  const [isValidating, setIsValidating] = useState(false);

  const [user, setUser] = useState<{
    email?: string | undefined;
    avatar_url?: string | undefined;
    full_name?: string | undefined;
  } | null>(null);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser({
          email: user.email,
          avatar_url: user.user_metadata?.avatar_url,
          full_name: user.user_metadata?.full_name,
        });
      }
    };

    fetchUserData();
  }, []);

  // Update localStorage when server type changes
  useEffect(() => {
    localStorage.setItem('serverType', serverType);
    if (serverType === 'default') {
      setActiveServerUrl('Default');
      setCustomUrl(''); // Clear custom URL when switching to default
    } else {
      const savedUrl = localStorage.getItem('savedCustomUrl');
      if (savedUrl) {
        setActiveServerUrl(savedUrl);
        setCustomUrl(savedUrl);
      }
    }
  }, [serverType]);

  const handleSaveUrl = async () => {
    if (customUrl && serverType === 'custom') {
      try {
        setIsValidating(true);
        
        // Test the connection directly without appending to the base URL
        try {
          // Don't use apiClient.get here as it will append the URL again
          const response = await fetch(`${customUrl.trim()}/health`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          });
          
          if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
          }
          
          setActiveServerUrl(customUrl);
          localStorage.setItem('savedCustomUrl', customUrl);
          localStorage.setItem('customUrl', customUrl);
          toast({ title: "Success", description: "Custom server URL has been saved.", variant: "default" });
        } catch (error) {
          toast({ title: "Server Error", description: "Could not connect to the server.", variant: "destructive" });
        }
      } catch {
        toast({ title: "Connection Error", description: "Failed to connect to the server.", variant: "destructive" });
      } finally {
        setIsValidating(false);
      }
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '??';
    return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0,2);
  };

  // Job statistics using jobsStore
  const { jobs, fetchJobs } = useJobsStore();
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);
  const stats = useMemo(() => {
    const counts: Record<string, number> = { pending: 0, processing: 0, successful: 0, crashed: 0 };
    jobs.forEach(job => {
      const s = job.status;
      if (counts[s] !== undefined) counts[s]++;
      else counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [jobs]);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 space-y-8 p-8 pt-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">Manage your account and application preferences</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Information Card (Left Column, Top Row) */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Your personal information and account details</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center space-x-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user?.avatar_url} />
                <AvatarFallback>{getInitials(user?.full_name)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">{user?.full_name || 'User'}</h3>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </CardContent>
          </Card>

          {/* Server Configuration Card (Right Column) */}
          <Card>
            <CardHeader>
              <CardTitle>Server Configuration</CardTitle>
              <CardDescription>Choose default or custom server</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Server Info Section */}
              <div className="space-y-4 p-4 bg-muted/30 rounded-md">
                <div>
                  <div className="mb-1 text-sm text-muted-foreground">Server Type</div>
                  <div className="font-medium">{serverType}</div>
                </div>
                <div>
                  <div className="mb-1 text-sm text-muted-foreground">Server URL</div>
                  <div className="font-medium">
                    {activeServerUrl}
                  </div>
                </div>
              </div>
              
              {/* Configuration controls */}
              <div className="space-y-4">
                <Select value={serverType} onValueChange={setServerType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select server type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                
                {serverType === 'custom' && (
                  <div className="space-y-2">
                    <Input
                      placeholder="Enter server URL"
                      value={customUrl}
                      onChange={e => setCustomUrl(e.target.value)}
                    />
                    <Button
                      onClick={handleSaveUrl}
                      disabled={!customUrl.trim() || isValidating}
                      className="w-full"
                    >
                      {isValidating ? (
                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      ) : null}
                      Save Configuration
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Job Statistics Card (Left Column, Bottom Row) */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Job Statistics</CardTitle>
              <CardDescription>Basic breakdown of your jobs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Successful</p>
                  <p className="text-2xl font-semibold text-green-600">{stats.successful}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Processing</p>
                  <p className="text-2xl font-semibold text-blue-600">{stats.processing}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-semibold text-yellow-600">{stats.pending}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-2xl font-semibold text-red-600">{stats.crashed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}