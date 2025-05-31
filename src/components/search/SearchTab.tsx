import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function SearchTab() {
  const [searchMode, setSearchMode] = useState<'search' | 'history'>('search');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Search Sequences</h2>
        <Tabs value={searchMode} onValueChange={(value) => setSearchMode(value as 'search' | 'history')} className="w-[200px]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">Search</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {searchMode === 'search' && (
        <Card className="p-6 border border-border shadow-sm">
          <div className="space-y-4">
            {/* Search Box with enhanced styling */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              </div>
              <Input
                className={cn(
                  "pl-12 h-14 text-base rounded-lg border-muted focus:border-primary transition-all",
                  "shadow-sm hover:shadow focus:shadow-md"
                )}
                placeholder="Search for proteins, sequences, or PDB IDs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Search Mode Buttons */}
            <div className="flex space-x-2 items-center">
              <Button 
                variant="default" 
                className="shadow-sm hover:shadow transition-all"
              >
                normal
              </Button>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      disabled 
                      className="opacity-60"
                    >
                      by structure
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-popover shadow-lg">
                    <p>Coming soon</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      disabled 
                      className="opacity-60"
                    >
                      agent
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-popover shadow-lg">
                    <p>Coming soon</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {searchQuery && (
                <div className="ml-auto">
                  <Button>
                    Search
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {searchMode === 'history' && (
        <Card className="p-6 border border-border shadow-sm">
          <div className="min-h-[520px] flex items-center justify-center text-center">
            <div className="text-muted-foreground">
              <div className="mb-2 opacity-20">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto h-8 w-8">
                  <path d="M12 8v4l3 3"></path>
                  <circle cx="12" cy="12" r="10"></circle>
                </svg>
              </div>
              <p>Your search history will appear here</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export default SearchTab; 