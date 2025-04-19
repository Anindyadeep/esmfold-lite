import React from "react";
import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "../lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const plusJakarta = Plus_Jakarta_Sans({ 
  subsets: ["latin"], 
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "ESMFold Lite",
  description: "A lightweight interface for ESMFold protein structure prediction",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.variable,
          plusJakarta.variable
        )}
      >
        <div className="relative flex min-h-screen flex-col">
          <main className="container mx-auto flex-1 space-y-6 px-4 py-8 md:px-8 lg:py-12">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
} 