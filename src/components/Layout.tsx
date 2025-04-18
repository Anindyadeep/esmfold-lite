import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { Settings, Home, Eye } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

const navItems = [
  { name: "Jobs", path: "/", icon: Home },
  { name: "Visualize", path: "/visualize", icon: Eye },
  { name: "Settings", path: "/settings", icon: Settings },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-64 border-r bg-card shadow-sm transition-all duration-200">
          <div className="flex h-14 items-center border-b px-6">
            <h1 className="text-lg font-semibold tracking-tight">LiteFold</h1>
          </div>
          <nav className="p-4 space-y-1">
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
            {children}
          </div>
        </div>
      </div>
    </div>
  );
} 