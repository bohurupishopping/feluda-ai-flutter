"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/chat';
  const [origin, setOrigin] = useState<string>('');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        toast.success("Welcome to FeludaAI!", {
          description: "Successfully signed in to your account"
        });
        router.push(redirectTo);
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router, redirectTo]);

  const handleLoginSuccess = () => {
    router.push(redirectTo);
    router.refresh();
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden">
      {/* Animated Background - keeping the same gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50/90 via-slate-50/95 to-purple-50/90">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.2),rgba(255,255,255,0))]" />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0 bg-[url('/assets/ai.png')] opacity-[0.015]"
        />
        <div className="absolute inset-0 backdrop-blur-[120px]" />
      </div>

      {/* Content */}
      <div className="relative flex flex-col h-full z-10">
        {/* Header - more compact */}
        <header className="w-full py-2.5 px-4 flex justify-center items-center 
          border-b border-white/10 backdrop-blur-xl bg-white/30">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2"
          >
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 
                rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-300" />
              <img 
                src="/assets/ai-icon.png" 
                alt="Bohurupi AI" 
                className="w-7 h-7 rounded-lg shadow-sm relative"
              />
            </div>
            <span className="text-sm font-semibold bg-gradient-to-r from-gray-800 to-gray-600 
              bg-clip-text text-transparent">
              FeludaAI
            </span>
          </motion.div>
        </header>

        {/* Main Content - more compact spacing */}
        <div className="flex-1 flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-[340px] mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="space-y-4"
            >
              {/* Welcome Text - more compact */}
              <div className="text-center space-y-1">
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 
                  bg-clip-text text-transparent">
                  Welcome Back
                </h1>
                <p className="text-xs text-gray-500/90">
                  Sign in to continue to your account
                </p>
              </div>

              {/* Login Card - more compact styling */}
              <div className="bg-white/50 backdrop-blur-xl border border-white/20 
                shadow-[0_4px_20px_rgba(0,0,0,0.04)] 
                hover:shadow-[0_4px_25px_rgba(0,0,0,0.06)]
                transition-all duration-300
                rounded-xl overflow-hidden p-3 sm:p-4">
                <Auth
                  supabaseClient={supabase}
                  appearance={{
                    theme: ThemeSupa,
                    variables: {
                      default: {
                        colors: {
                          brand: '#3B82F6',
                          brandAccent: '#2563EB',
                        },
                      },
                    },
                    className: {
                      container: 'w-full space-y-3',
                      button: `w-full px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-300
                        hover:opacity-95 flex items-center justify-center gap-2 
                        bg-gradient-to-r from-blue-500 to-blue-600 
                        hover:from-blue-600 hover:to-blue-700
                        text-white shadow-sm hover:shadow
                        transform hover:scale-[1.01] active:scale-[0.99]`,
                      label: 'text-xs font-medium text-gray-600',
                      input: `w-full px-3 py-1.5 rounded-lg border border-gray-200/70
                        focus:ring-2 focus:ring-blue-50 focus:border-blue-400 
                        transition-all duration-300
                        bg-white/60 backdrop-blur-sm
                        text-sm`,
                      loader: 'animate-spin',
                      anchor: 'text-blue-500 hover:text-blue-600 text-xs font-medium transition-colors duration-200',
                      divider: 'bg-gray-200/60',
                      message: 'text-xs text-gray-600 rounded-lg bg-gray-50/80 p-2.5',
                    },
                  }}
                  providers={[]}
                  redirectTo="/chat"
                  magicLink={true}
                />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Footer - more compact */}
        <footer className="w-full py-2 px-4 text-center text-[10px] text-gray-400 
          border-t border-white/10 bg-white/30 backdrop-blur-xl">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row justify-center items-center gap-1.5 sm:gap-3"
          >
            <span>© 2024 Bohurupi AI. All rights reserved.</span>
            <div className="flex items-center gap-3">
              <a href="#" className="hover:text-gray-600 transition-colors duration-200">Privacy</a>
              <span className="hidden sm:inline text-gray-300">•</span>
              <a href="#" className="hover:text-gray-600 transition-colors duration-200">Terms</a>
            </div>
          </motion.div>
        </footer>
      </div>
    </div>
  );
} 