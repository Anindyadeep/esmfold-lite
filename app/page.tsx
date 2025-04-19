import Link from "next/link";
import { Settings } from "lucide-react";

export default function Home() {
  return (
    <main className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">ESMFold Lite</h1>
        <Link href="/settings" className="flex items-center gap-2 hover:text-primary">
          <Settings size={20} />
          <span>Settings</span>
        </Link>
      </div>
      
      {/* Your existing main page content */}
      
    </main>
  );
} 