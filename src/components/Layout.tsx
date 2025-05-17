import { cn } from "@/lib/utils";
import { Link, useLocation, Outlet } from "react-router-dom";
import { Settings, Home, Eye, LogOut, PanelLeftClose, PanelLeft, Github, FlaskConical } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { getApiUrl } from "@/lib/config";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const navItems = [
  { name: "Jobs", path: "/", icon: Home },
  { name: "Visualize", path: "/visualize", icon: Eye },
  { name: "Experiments", path: "/experiments", icon: FlaskConical },
  { name: "Settings", path: "/settings", icon: Settings },
];

export function Layout() {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [serverStatus, setServerStatus] = useState<'online' | 'offline'>('offline');
  const [user, setUser] = useState<{
    email?: string;
    avatar_url?: string;
    full_name?: string;
  } | null>(null);

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

  // Check server status
  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        // Use apiClient for health check to maintain consistent auth
        const response = await fetch(`${getApiUrl()}/health`);
        setServerStatus(response.ok ? 'online' : 'offline');
      } catch (error) {
        setServerStatus('offline');
      }
    };

    // Check initially
    checkServerStatus();
    
    // Set up polling interval
    const intervalId = setInterval(checkServerStatus, 30000); // Check every 30 seconds
    
    return () => clearInterval(intervalId);
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className={cn(
          "border-r bg-card shadow-sm transition-all duration-200",
          isCollapsed ? "w-16" : "w-64"
        )}>
          <div className="flex h-14 items-center border-b px-4 justify-between">
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="LiteFold Logo" className="h-8 w-8" />
                <h1 className="text-xl font-semibold tracking-tight">LiteFold</h1>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className={cn(
                          "h-2.5 w-2.5 rounded-full",
                          serverStatus === 'online' ? "bg-green-500" : "bg-red-500"
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{serverStatus === 'online' ? 'Server running' : 'Server offline'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
            {isCollapsed ? (
              <div className="flex items-center justify-center w-full">
                <img src="/logo.png" alt="LiteFold Logo" className="h-8 w-8" />
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-8 w-8"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            )}
          </div>
          {isCollapsed && (
            <div className="flex justify-center mt-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-8 w-8"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            </div>
          )}
          <nav className={cn(
            "flex flex-col justify-between p-2",
            isCollapsed 
              ? "h-[calc(100%-3.5rem-2.5rem)]" // Adjust for the extra button height when collapsed
              : "h-[calc(100%-3.5rem)]"
          )}>
            <div className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200",
                    location.pathname === item.path
                      ? "bg-primary/10 text-primary hover:bg-primary/15"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon className="h-4 w-4" />
                  {!isCollapsed && item.name}
                </Link>
              ))}
            </div>
            
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={cn(
                    "px-3 py-2 flex items-center gap-3 rounded-md hover:bg-muted transition-colors",
                    isCollapsed ? "justify-center" : "w-full"
                  )}>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                    </Avatar>
                    {!isCollapsed && (
                      <div className="flex flex-col text-left">
                        <span className="text-sm font-medium truncate">{user.full_name}</span>
                        <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                      </div>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-60">
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto">
          <div className="h-14 border-b bg-card/50 backdrop-blur-sm flex items-center justify-between px-6">
            <h2 className="text-lg font-medium">
              {navItems.find((item) => item.path === location.pathname)?.name}
            </h2>
            <a 
              href="https://github.com/Anindyadeep/litefold"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-5 w-5" />
              <span className="hidden sm:inline">LiteFold GitHub</span>
            </a>
          </div>
          <div className="p-6">
            <Outlet />
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
} 