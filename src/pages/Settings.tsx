'use client';

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
import { DEFAULT_API_URL } from "@/lib/config";

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
      // When switching to custom, show the previously saved custom URL if it exists
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
        // Check if the server is accessible by sending a request to the health endpoint
        const healthUrl = `${customUrl.trim()}/health`;
        const response = await fetch(healthUrl, { 
          method: 'GET',
          mode: 'cors',
          headers: {
            'Accept': 'application/json',
          }
        });
        
        if (response.ok) {
          setActiveServerUrl(customUrl);
          localStorage.setItem('savedCustomUrl', customUrl);
          localStorage.setItem('customUrl', customUrl);
          toast({
            title: "Success",
            description: "Custom server URL has been saved.",
            variant: "default",
          });
        } else {
          toast({
            title: "Server Error",
            description: "Could not connect to the server. Please check the URL and try again.",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Connection Error",
          description: "Failed to connect to the server. Please check the URL and try again.",
          variant: "destructive",
        });
        console.error("Server validation error:", error);
      } finally {
        setIsValidating(false);
      }
    }
  };

  // Get initials for avatar fallback
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
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 space-y-8 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
            <p className="text-muted-foreground">
              Manage your account and application preferences
            </p>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Profile Section */}
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Your personal information and account details
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user?.avatar_url} alt={user?.full_name || 'Profile'} />
                <AvatarFallback className="text-lg">{getInitials(user?.full_name)}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h3 className="text-xl font-semibold tracking-tight">
                  {user?.full_name || 'Loading...'}
                </h3>
                <p className="text-sm text-muted-foreground">{user?.email || 'Loading...'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Current Configuration Display */}
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Active Configuration</CardTitle>
              <CardDescription>
                Your current server settings and configuration status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 rounded-lg border p-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium leading-none text-muted-foreground">
                    Server Type
                  </p>
                  <p className="text-sm font-medium">
                    {serverType.charAt(0).toUpperCase() + serverType.slice(1)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium leading-none text-muted-foreground">
                    Active Server URL
                  </p>
                  <p className="text-sm font-medium break-all">
                    {activeServerUrl === 'Default' ? 'Default ESMFold Server' : activeServerUrl}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Server Configuration */}
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Server Configuration</CardTitle>
              <CardDescription>
                Choose between the default ESMFold server or configure a custom server
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Server Type
                </label>
                <Select
                  value={serverType}
                  onValueChange={setServerType}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select server type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default Server</SelectItem>
                    <SelectItem value="custom">Custom Server</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {serverType === 'default' 
                    ? 'Using the default ESMFold server for predictions'
                    : 'Configure a custom server for your predictions'}
                </p>
              </div>

              {serverType === 'custom' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Custom Server URL
                    </label>
                    <Input
                      placeholder="Enter your custom server URL"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Enter the complete URL of your custom ESMFold server
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Button 
                      onClick={handleSaveUrl}
                      disabled={!customUrl.trim() || isValidating}
                      className="w-full sm:w-auto"
                    >
                      {isValidating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Validating Server
                        </>
                      ) : (
                        "Save Configuration"
                      )}
                    </Button>
                    {!customUrl.trim() && (
                      <p className="text-sm text-muted-foreground">
                        Please enter a valid URL to save
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 