'use client';

import { useState } from 'react';
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

export default function Settings() {
  const [serverType, setServerType] = useState('default');
  const [customUrl, setCustomUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState('');

  const handleSaveUrl = () => {
    setSavedUrl(customUrl);
  };

  return (
    <div className="flex flex-col space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and application preferences
        </p>
      </div>

      <div className="grid gap-6">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Your personal information and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src="https://github.com/shadcn.png" alt="Profile" />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h3 className="text-lg font-medium">John Doe</h3>
              <p className="text-sm text-muted-foreground">john.doe@example.com</p>
            </div>
          </CardContent>
        </Card>

        {/* Server URL Section */}
        <Card>
          <CardHeader>
            <CardTitle>Server Configuration</CardTitle>
            <CardDescription>
              Configure the ESMFold server connection settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Server URL
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
            </div>

            {serverType === 'custom' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Custom URL
                  </label>
                  <Input
                    placeholder="Enter custom server URL"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                  />
                </div>
                <Button onClick={handleSaveUrl} className="w-full sm:w-auto">
                  Save Configuration
                </Button>
                
                {savedUrl && (
                  <div className="rounded-lg border bg-card p-4">
                    <h4 className="text-sm font-medium leading-none">Current Server URL</h4>
                    <p className="mt-2 text-sm text-muted-foreground break-all">{savedUrl}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 