import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { AnimatedSections } from "@/components/home/animated-sections";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'FeludaAI : Your Ultimate Magajastra',
  description: 'Experience the power of multiple language models in one platform. FeludaAI lets you interact with various LLMs, compare their responses, and choose the best AI model for your needs.',
  keywords: 'FeludaAI, multiple LLMs, artificial intelligence, language models, AI platform, chatbot, AI comparison',
  openGraph: {
    title: 'FeludaAI : Your Ultimate Magajastra',
    description: 'Experience the power of multiple language models in one platform. FeludaAI lets you interact with various LLMs, compare their responses, and choose the best AI model for your needs.',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: '/assets/ai-icon.png',
        width: 1200,
        height: 630,
        alt: 'FeludaAI Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FeludaAI : Your Ultimate Magajastra',
    description: 'Experience the power of multiple language models in one platform. FeludaAI lets you interact with various LLMs, compare their responses, and choose the best AI model for your needs.',
    images: ['/assets/ai-icon.png'],
  },
};

export default async function Home() {
  // Initialize Supabase client
  const supabase = createServerComponentClient({ cookies });
  
  // Check authentication status
  const { data: { session } } = await supabase.auth.getSession();
  
  // Redirect if user is authenticated
  if (session) {
    redirect('/chat');
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation Header */}
      <header className="w-full py-4 px-6 border-b backdrop-blur-xl bg-background/50 sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/30 to-purple-500/30 
                rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-300" />
              <img 
                src="/assets/ai-icon.png" 
                alt="Bohurupi AI" 
                className="w-9 h-9 rounded-xl shadow-sm relative"
              />
            </div>
            <span className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 
              bg-clip-text text-transparent">
              FeludaAI
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <ModeToggle />
            <Link href="/login">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 
                hover:to-purple-700 text-white">
                Sign In
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <div className="relative">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-b from-background to-background/50 -z-10" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))] -z-10" />
          
          {/* Content */}
          <div className="max-w-7xl mx-auto px-6 py-20">
            <AnimatedSections />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 px-6 border-t bg-background/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="text-sm text-muted-foreground">
            © 2024 FeludaAI. All rights reserved.
          </span>
          <div className="flex items-center gap-6">
            <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}