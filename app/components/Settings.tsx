'use client';

import { useState } from 'react';
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

export default function Settings() {
  const [serverType, setServerType] = useState('default');
  const [customUrl, setCustomUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState('');

  const handleSaveUrl = () => {
    setSavedUrl(customUrl);
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
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-lg font-medium">John Doe</h3>
            <p className="text-sm text-muted-foreground">john.doe@example.com</p>
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
              <Button onClick={handleSaveUrl}>Save URL</Button>
              
              {savedUrl && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">Current Server URL:</p>
                  <p className="text-sm text-muted-foreground break-all">{savedUrl}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 