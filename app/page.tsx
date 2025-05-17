import React, { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../src/components/ui/card"
import Link from "next/link"

export default function Home() {
  // Client-side only code for the card highlight effect
  if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      const cards = document.querySelectorAll('.card-highlight');
      cards.forEach(card => {
        card.parentElement?.addEventListener('mousemove', (e) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          (card as HTMLElement).style.setProperty('--x', `${x}px`);
          (card as HTMLElement).style.setProperty('--y', `${y}px`);
        });
      });
    });
  }

  return (
    <div className="flex flex-col space-y-12">
      <div className="flex flex-col space-y-4 max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent animate-in">
          ESMFold Lite
        </h1>
        <p className="text-muted-foreground text-lg">
          A lightweight interface for ESMFold protein structure prediction with best-in-class performance
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/visualize" className="group">
          <Card className="h-full transition-all duration-300 border-border/60 hover:border-accent/30 hover:-translate-y-1">
            <div className="card-highlight opacity-0 transition-opacity absolute inset-0" style={{ "--x": "50%", "--y": "50%" } as any}></div>
            <CardHeader>
              <CardTitle className="group-hover:text-accent transition-colors">Predict Structure</CardTitle>
              <CardDescription>
                Upload a protein sequence to predict its 3D structure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-24 rounded-md bg-secondary flex items-center justify-center">
                <div className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">3D</div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/visualize" className="group">
          <Card className="h-full transition-all duration-300 border-border/60 hover:border-accent/30 hover:-translate-y-1">
            <div className="card-highlight opacity-0 transition-opacity absolute inset-0" style={{ "--x": "50%", "--y": "50%" } as any}></div>
            <CardHeader>
              <CardTitle className="group-hover:text-accent transition-colors">Recent Predictions</CardTitle>
              <CardDescription>
                View your recent structure predictions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-24 rounded-md bg-secondary flex items-center justify-center">
                <div className="text-2xl font-bold bg-gradient-to-r from-molecule-purple to-molecule-magenta bg-clip-text text-transparent">History</div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/experiments" className="group">
          <Card className="h-full transition-all duration-300 border-border/60 hover:border-accent/30 hover:-translate-y-1">
            <div className="card-highlight opacity-0 transition-opacity absolute inset-0" style={{ "--x": "50%", "--y": "50%" } as any}></div>
            <CardHeader>
              <CardTitle className="group-hover:text-accent transition-colors">Experiments</CardTitle>
              <CardDescription>
                View experiment comparisons and results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-24 rounded-md bg-secondary flex items-center justify-center">
                <div className="text-2xl font-bold bg-gradient-to-r from-molecule-green to-molecule-teal bg-clip-text text-transparent">Data</div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/settings" className="group">
          <Card className="h-full transition-all duration-300 border-border/60 hover:border-accent/30 hover:-translate-y-1">
            <div className="card-highlight opacity-0 transition-opacity absolute inset-0" style={{ "--x": "50%", "--y": "50%" } as any}></div>
            <CardHeader>
              <CardTitle className="group-hover:text-accent transition-colors">Settings</CardTitle>
              <CardDescription>
                Configure your prediction parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-24 rounded-md bg-secondary flex items-center justify-center">
                <div className="text-2xl font-bold bg-gradient-to-r from-molecule-blue to-molecule-teal bg-clip-text text-transparent">Config</div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="flex flex-col space-y-4 mt-8">
        <div className="bg-gradient-to-r p-px from-primary/20 to-accent/20 rounded-lg">
          <div className="bg-card rounded-[calc(var(--radius-lg)-1px)] px-6 py-5">
            <h3 className="text-xl font-medium mb-2">About ESMFold Lite</h3>
            <p className="text-muted-foreground">
              ESMFold Lite is a streamlined interface for protein structure prediction using the ESMFold algorithm.
              Upload your sequences and get high-quality 3D structure predictions in minutes.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 