"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MessageSquare, 
  LogOut, 
  UserRound, 
  ChevronRight, 
  Settings, 
  PlusCircle,
  ImageIcon,
  MoreHorizontal,
  Trash2,
  Eye,
  Menu,
  X,
  PanelLeftOpen,
  Sparkles,
  Globe2,
  Zap,
  Radio,
  FileText
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConversationService, ChatSession } from '@/services/conversationService';
import { Database } from '@/types/supabase';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Json } from '@/types/supabase';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

// Add type for conversation data
type ConversationData = Database['public']['Tables']['conversations']['Row'];
type ConversationMetadata = {
  deleted_at?: string;
  deleted_by?: string;
  [key: string]: any;
};

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSessionId = searchParams.get('session');
  const { toast } = useToast();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [userProfile, setUserProfile] = useState<{ display_name: string | null }>({ display_name: null });
  
  // Initialize Supabase client
  const supabase = useMemo(() => createClientComponentClient<Database>(), []);
  const conversationService = useMemo(() => new ConversationService(currentSessionId || undefined), [currentSessionId]);

  const loadChatSessions = useCallback(async () => {
    try {
      const sessions = await conversationService.getChatSessions(7);
      const formattedSessions = sessions.map(session => ({
        ...session,
        timestamp: new Date(session.timestamp).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        last_message: session.last_message?.length > 30 
          ? session.last_message.substring(0, 30) + '...'
          : session.last_message || 'New Conversation'
      }));
      setChatSessions(formattedSessions);
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load chat history",
        variant: "destructive",
      });
    }
  }, [conversationService, toast]);

  // Improved fetchUserProfile with proper error handling
  const fetchUserProfile = useCallback(async () => {
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) return;

      // Set email immediately if available
      if (user.email) setUserEmail(user.email);

      // Get or create profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single<UserProfile>();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          // Profile doesn't exist, create one
          const { data: newProfile, error: insertError } = await supabase
            .from('user_profiles')
            .insert([{
              user_id: user.id,
              display_name: user.email?.split('@')[0] || 'User',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }])
            .select('*')
            .single<UserProfile>();

          if (insertError) throw insertError;
          if (newProfile) {
            setUserProfile({ display_name: newProfile.display_name });
          }
        } else {
          throw profileError;
        }
      } else if (profile) {
        setUserProfile({ display_name: profile.display_name });
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      toast({
        title: "Profile Error",
        description: "Failed to load user profile. Please try refreshing.",
        variant: "destructive",
      });
    }
  }, [supabase, toast]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  useEffect(() => {
    loadChatSessions();
  }, [currentSessionId, loadChatSessions]);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsCollapsed(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    const handleChatUpdate = () => loadChatSessions();
    window.addEventListener('chat-updated', handleChatUpdate);
    return () => window.removeEventListener('chat-updated', handleChatUpdate);
  }, [loadChatSessions]);

  // Auth state change listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login');
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  // Improved delete function with proper database deletion
  const handleDeleteSession = async (sessionId: string) => {
    try {
      // Start loading state
      toast({
        title: "Deleting...",
        description: "Please wait while we delete the chat history",
      });

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      // First, verify the session exists and belongs to the user
      const { data: conversations, error: fetchError } = await supabase
        .from('conversations')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_deleted', false)
        .returns<ConversationData[]>();

      if (fetchError) throw fetchError;
      if (!conversations || conversations.length === 0) {
        throw new Error('Chat session not found or already deleted');
      }

      // Verify ownership
      const sessionUserId = conversations[0].user_id;
      if (sessionUserId && user?.id !== sessionUserId) {
        throw new Error('You do not have permission to delete this chat');
      }

      // Parse existing metadata and prepare new metadata
      const existingMetadata = (conversations[0].metadata || {}) as ConversationMetadata;
      const newMetadata: Json = {
        ...existingMetadata,
        deleted_at: new Date().toISOString(),
        deleted_by: user?.id || 'anonymous'
      };

      // Perform the delete operation with proper type handling
      const { error: deleteError } = await supabase
        .from('conversations')
        .update({
          is_deleted: true,
          metadata: newMetadata
        })
        .eq('session_id', sessionId);

      if (deleteError) throw deleteError;

      // Update local state
      setChatSessions(prev => 
        prev.filter(session => session.session_id !== sessionId)
      );

      // If current session is deleted, redirect
      if (currentSessionId === sessionId) {
        router.push('/chat');
      }

      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('chat-updated'));

      // Show success message
      toast({
        title: "Success",
        description: "Chat history has been permanently deleted",
      });

      // Reload sessions to ensure sync
      await loadChatSessions();

    } catch (error) {
      console.error('Error in handleDeleteSession:', error);
      
      // Revert local state
      await loadChatSessions();
      
      toast({
        title: "Delete Failed",
        description: error instanceof Error 
          ? error.message 
          : "Failed to delete chat history. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Add confirmation before delete with more context
  const handleDeleteWithConfirmation = async (sessionId: string) => {
    const session = chatSessions.find(s => s.session_id === sessionId);
    if (!session) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete this chat?\n\n` +
      `Last message: "${session.last_message}"\n` +
      `Messages: ${session.message_count}\n\n` +
      `This action cannot be undone.`
    );
    
    if (confirmed) {
      await handleDeleteSession(sessionId);
    }
  };

  const handleViewSession = async (sessionId: string) => {
    try {
      router.push(`/chat?session=${sessionId}`);
      window.dispatchEvent(new CustomEvent('chat-updated'));
      
      toast({
        title: "Chat Loaded",
        description: "Previous conversation loaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load chat history",
        variant: "destructive",
      });
    }
  };

  const menuItems = [
    { 
      icon: MessageSquare, 
      label: 'AI Chat', 
      href: '/chat', 
      color: 'text-blue-400',
      description: 'Smart AI Chat Assistant'
    },
    { 
      icon: ImageIcon, 
      label: 'Imagine', 
      href: '/imagine', 
      color: 'text-indigo-400',
      description: 'AI Image Generation'
    },
    { 
      icon: FileText, 
      label: 'Document AI', 
      href: '/document', 
      color: 'text-emerald-400',
      description: 'Document Analysis & Chat'
    },
    { 
      icon: Globe2, 
      label: 'Lively', 
      href: '/lively', 
      color: 'text-emerald-400',
      description: 'Real-time AI with Grounding'
    },
  ];

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }

      // Clear any local storage or state if needed
      localStorage.clear();
      
      // Show success toast
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account",
      });

      // Redirect to login page
      router.push("/login");
      router.refresh(); // Refresh to ensure auth state is updated
      
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error signing out",
        description: "There was a problem signing out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && isCollapsed && (
        <motion.button
          className="fixed left-4 top-4 z-50 
            bg-white/80 backdrop-blur-sm rounded-xl p-2.5
            shadow-sm border border-white/20
            hover:bg-white/90 transition-colors duration-200
            group"
          onClick={() => setIsCollapsed(false)}
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Menu className="h-5 w-5 text-gray-600 group-hover:text-gray-900" />
        </motion.button>
      )}

      <motion.div 
        className={`fixed md:relative z-40 h-screen
          bg-white/60 backdrop-blur-xl border-r border-white/20
          transition-colors duration-200
          flex flex-col overflow-hidden
          ${isCollapsed ? 'w-0 md:w-16' : 'w-[240px]'}
          shadow-sm hover:shadow-md
          md:rounded-[2.5rem] md:m-4 md:h-[calc(100vh-32px)]
          md:border
          ${isMobile ? 'h-full pb-safe-area-inset-bottom' : ''}`}
        initial={false}
        animate={{ 
          width: isCollapsed ? isMobile ? 0 : 64 : 240,
          opacity: isCollapsed && isMobile ? 0 : 1
        }}
        transition={{ 
          duration: 0.2,
          ease: 'easeInOut'
        }}
      >
        {/* Header */}
        <div className="flex items-center p-4 border-b border-white/20 backdrop-blur-sm bg-white/20">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 
                rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-300" />
              <img 
                src="/assets/ai-icon.png" 
                alt="AI Icon" 
                className="w-9 h-9 rounded-2xl shadow-sm relative"
              />
            </div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.h1 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 
                    bg-clip-text text-transparent"
                >
                  FeludaAI
                </motion.h1>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <Button
            variant="outline"
            className={`w-full justify-center gap-2.5 
              bg-gradient-to-r from-blue-500 to-purple-500 
              hover:from-blue-600 hover:to-purple-600 
              text-white border-0 
              shadow-lg hover:shadow-xl 
              transition-all duration-300 
              backdrop-blur-sm rounded-2xl
              ${isCollapsed ? 'p-2.5' : 'px-4 py-3'}`}
            onClick={() => router.push('/chat')}
          >
            <PlusCircle className="h-5 w-5" />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="text-sm font-medium"
                >
                  New Chat
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex flex-col h-[calc(100%-140px)]">
          <div className="px-3 py-2 space-y-2">
            {menuItems.map((item) => (
              <Button
                key={item.label}
                variant="ghost"
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center' : 'justify-start'
                } gap-3 px-4 py-3 rounded-2xl transition-all duration-300 
                hover:bg-white/40 hover:shadow-md
                ${pathname === item.href
                  ? 'bg-white/50 text-gray-900 shadow-md'
                  : 'text-gray-700'}`}
                onClick={() => router.push(item.href)}
              >
                <item.icon className={`h-5 w-5 ${item.color}`} />
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="flex flex-col items-start"
                    >
                      <span className="text-sm font-medium text-gray-700 truncate max-w-[120px] group-hover:text-gray-900">
                        {item.label}
                      </span>
                      <span className="text-xs text-gray-500">{item.description}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            ))}
          </div>

          {/* Chat History - Updated Section with Fixed Height */}
          <div className="flex-1 flex flex-col">
            <div className="px-5 py-3 border-t border-gray-200/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500">Recent Chats</span>
                {!isCollapsed && chatSessions.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-gray-500 hover:text-gray-700"
                    onClick={() => router.push('/chat')}
                  >
                    View All
                  </Button>
                )}
              </div>
            </div>
            <div className="h-[280px] overflow-y-auto scrollbar-thin scrollbar-track-transparent 
              scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400 px-3 pb-2">
              <AnimatePresence>
                {chatSessions.map((session, index) => {
                  const colors = [
                    'text-blue-400',
                    'text-purple-400',
                    'text-pink-400',
                    'text-indigo-400',
                    'text-teal-400',
                    'text-cyan-400',
                    'text-green-400'
                  ];
                  const colorClass = colors[index % colors.length];

                  return (
                    <motion.div
                      key={session.session_id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="mb-1.5"
                    >
                      <div className={`group relative p-2.5 rounded-xl 
                        hover:bg-gradient-to-r hover:from-gray-50/80 hover:to-gray-100/50
                        transition-all duration-300 cursor-pointer
                        hover:shadow-sm backdrop-blur-sm
                        ${session.session_id === currentSessionId ? 'bg-white/60 shadow-sm' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <div 
                            className="flex items-center space-x-2.5 flex-1"
                            onClick={() => handleViewSession(session.session_id)}
                          >
                            <div className={`p-2 rounded-xl bg-white/50 ${session.session_id === currentSessionId ? 'shadow-sm' : ''}`}>
                              <MessageSquare className={`h-4 w-4 ${colorClass} transition-transform duration-300 group-hover:scale-110`} />
                            </div>
                            {!isCollapsed && (
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-700 truncate max-w-[120px] group-hover:text-gray-900">
                                  {session.last_message}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {session.message_count} messages • {session.timestamp}
                                </span>
                              </div>
                            )}
                          </div>
                          {!isCollapsed && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem 
                                  onClick={() => handleViewSession(session.session_id)}
                                  className="text-gray-600 hover:text-gray-900"
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Chat
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteWithConfirmation(session.session_id)}
                                  className="text-red-600 hover:text-red-700 cursor-pointer 
                                    flex items-center gap-2 px-3 py-2 text-sm
                                    hover:bg-red-50 transition-colors duration-200"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span>Delete Chat</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </nav>

        {/* User Profile Section - Will now stay fixed at bottom */}
        <div className={`mt-auto border-t border-white/20 p-3 bg-white/10 backdrop-blur-sm
          ${isMobile ? 'pb-safe-area-inset-bottom' : ''}`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className={`w-full flex items-center gap-3 
                  hover:bg-white/40 rounded-2xl 
                  transition-all duration-300 justify-between
                  p-2 group`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 rounded-2xl ring-2 ring-white/50 group-hover:ring-blue-200 transition-all duration-300">
                    <AvatarImage src="/assets/pritam-img.png" className="rounded-2xl" />
                    <AvatarFallback className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl">
                      <UserRound className="h-5 w-5 text-gray-600" />
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium text-gray-800">
                        {userProfile.display_name || 'Set display name'}
                      </span>
                      <span className="text-xs text-gray-500 truncate max-w-[130px]">
                        {userEmail}
                      </span>
                    </div>
                  )}
                </div>
                {!isCollapsed && <ChevronRight className="h-4 w-4 text-gray-400" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-56 rounded-2xl bg-white/90 backdrop-blur-xl border-white/20
                shadow-lg animate-in fade-in-80 slide-in-from-top-1"
            >
              <DropdownMenuItem 
                onClick={() => router.push('/profile')}
                className="gap-2 text-gray-600 hover:text-gray-900"
              >
                <UserRound className="h-4 w-4" />
                Edit Profile
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => router.push('/settings')}
                className="gap-2 text-gray-600 hover:text-gray-900"
              >
                <Settings className="h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleSignOut}
                className="gap-2 text-red-600 hover:text-red-700"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile Close Button */}
        {isMobile && !isCollapsed && (
          <motion.button
            className="absolute right-3 top-4
              bg-white/80 backdrop-blur-sm rounded-xl p-2.5
              shadow-sm border border-white/20
              hover:bg-white/90 transition-colors duration-200
              group z-50"
            onClick={() => setIsCollapsed(true)}
            initial={false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <X className="h-4 w-4 text-gray-600 group-hover:text-gray-900" />
          </motion.button>
        )}
      </motion.div>
    </>
  );
}