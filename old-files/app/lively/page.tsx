"use client";

import { useState, Suspense } from 'react';
import LivelyChatInterface from '@/components/lively/LivelyChatInterface';
import Sidebar from '@/components/shared/Sidebar';
import { Loader2 } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Create a loading component
function LoadingFallback() {
  return (
    <div className="h-screen w-full flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  );
}

// Wrap the main content in a separate component
function LivelyContent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const defaultMessage = `# Welcome to Lively! 👋

I'm powered by Gemini Pro with real-time information grounding. Ask me anything about current events, news, or any topic you'd like to explore!

Some example questions you can ask:
- What are the latest developments in AI technology?
- What's happening in world news today?
- Tell me about recent scientific discoveries
- What are the current trends in technology?
- Who won the latest major sports events?`;

  // Chat configuration with proper typing
  const config = {
    model: "gemini-1.5-pro",
    initialHistory: [
      {
        role: "user" as const,
        parts: [{ text: "Hi, I'd like to learn about current events and news." }],
      },
      {
        role: "model" as const,
        parts: [{ text: defaultMessage }],
      },
    ],
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar 
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      <main className="flex-1 overflow-hidden">
        <LivelyChatInterface 
          defaultMessage={defaultMessage}
          config={config}
        />
      </main>
    </div>
  );
}

// Main page component with Suspense boundary
export default function LivelyPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LivelyContent />
    </Suspense>
  );
} 