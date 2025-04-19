import { cn } from "@/lib/utils";
import { Link, useLocation, Outlet } from "react-router-dom";
import { Settings, Home, Eye, LogOut } from "lucide-react";
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

const navItems = [
  { name: "Jobs", path: "/", icon: Home },
  { name: "Visualize", path: "/visualize", icon: Eye },
  { name: "Settings", path: "/settings", icon: Settings },
];

export function Layout() {
  const location = useLocation();
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

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-64 border-r bg-card shadow-sm transition-all duration-200">
          <div className="flex h-14 items-center border-b px-6">
            <h1 className="text-lg font-semibold tracking-tight">LiteFold</h1>
          </div>
          <nav className="flex flex-col h-[calc(100%-3.5rem)] justify-between p-4">
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
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              ))}
            </div>
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full px-3 py-2 flex items-center gap-3 rounded-md hover:bg-muted transition-colors">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium truncate">{user.full_name}</span>
                      <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                    </div>
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
          <div className="h-14 border-b bg-card/50 backdrop-blur-sm flex items-center px-6">
            <h2 className="text-lg font-medium">
              {navItems.find((item) => item.path === location.pathname)?.name}
            </h2>
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