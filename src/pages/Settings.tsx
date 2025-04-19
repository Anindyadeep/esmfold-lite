'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
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

// Define the default server URL
const DEFAULT_SERVER_URL = 'https://api.example.com';

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

  const handleSaveUrl = () => {
    if (customUrl && serverType === 'custom') {
      setActiveServerUrl(customUrl);
      localStorage.setItem('savedCustomUrl', customUrl);
      localStorage.setItem('customUrl', customUrl);
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
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      
      {/* Profile Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center space-x-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user?.avatar_url} />
            <AvatarFallback>{getInitials(user?.full_name)}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-lg font-medium">{user?.full_name || 'Loading...'}</h3>
            <p className="text-sm text-muted-foreground">{user?.email || 'Loading...'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Current Configuration Display */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Current Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium">Server Type: <span className="text-primary">{serverType}</span></p>
            <p className="text-sm font-medium mt-2">Active Server URL: <span className="text-primary break-all">{activeServerUrl}</span></p>
          </div>
        </CardContent>
      </Card>

      {/* Server URL Section */}
      <Card>
        <CardHeader>
          <CardTitle>Server Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Server URL</label>
            <Select
              value={serverType}
              onValueChange={setServerType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select server type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {serverType === 'custom' && (
            <div className="space-y-4">
              <Input
                placeholder="Enter custom server URL"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
              />
              <Button 
                onClick={handleSaveUrl}
                disabled={!customUrl.trim()}
              >
                Save URL
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 