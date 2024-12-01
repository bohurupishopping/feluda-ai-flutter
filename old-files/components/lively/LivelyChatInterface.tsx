"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Search, Settings, MoreVertical, X, Copy, Check, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ReactMarkdown from 'react-markdown';
import { LivelyService } from '@/services/livelyService';

interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface ChatConfig {
  model: string;
  initialHistory: ChatMessage[];
}

interface LivelyChatInterfaceProps {
  defaultMessage?: string;
  sessionId?: string;
  config?: ChatConfig;
}

export default function LivelyChatInterface({ defaultMessage, sessionId, config }: LivelyChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(config?.initialHistory || [{
    role: 'model',
    parts: [{ text: defaultMessage || "Hello! How can I help you today?" }]
  }]);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const [livelyService] = useState(() => new LivelyService(sessionId));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleSearch = () => {
    setIsSearching(!isSearching);
    setSearchQuery('');
  };

  const filteredMessages = messages.filter(message => 
    message.parts[0].text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      toast({
        title: "Copied",
        description: "Text copied to clipboard",
        duration: 2000,
      });
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
      toast({
        title: "Copy failed",
        description: "Please try selecting and copying manually",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      parts: [{ text: prompt }]
    };

    setMessages(prev => [...prev, userMessage]);
    setPrompt('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await fetch('/api/lively', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt,
          history: messages,
          config: config
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate content');
      }

      const data = await response.json();

      if (data.result) {
        const assistantMessage: ChatMessage = {
          role: 'model',
          parts: [{ text: data.result }]
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        // Save conversation
        await livelyService.saveConversation(
          prompt, 
          data.result
        );
      }
    } catch (error) {
      console.error('Error generating response:', error);
      toast({
        title: "Error",
        description: "Failed to generate response",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden 
      px-3 sm:px-4 md:px-6 lg:px-8 py-0 sm:p-1 
      w-full max-w-[1600px] mx-auto
      bg-gradient-to-br from-purple-100 via-blue-100 to-pink-100">
      <Card className="flex-1 mx-0.5 my-0.5 sm:m-2 
        bg-white/60 backdrop-blur-[10px] 
        rounded-lg sm:rounded-[2rem] 
        border border-white/20 
        shadow-[0_8px_40px_rgba(0,0,0,0.12)] 
        relative flex flex-col overflow-hidden
        w-full max-w-[1400px] mx-auto
        h-[calc(100dvh-20px)] sm:h-[calc(98dvh-16px)]">
        <CardHeader className="border-b border-white/20 
          px-2 sm:px-6 py-1.5 sm:py-3
          flex flex-row justify-between items-center 
          bg-white/40 backdrop-blur-[10px]
          relative z-10
          h-auto sm:h-auto flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Avatar className="w-6 h-6 sm:w-10 sm:h-10">
              <AvatarImage src="/assets/ai.png" alt="AI Avatar" />
            </Avatar>
            <span className="font-medium text-xs sm:text-base hidden sm:inline">Lively AI : Powered by Gemini Pro</span>
            <span className="font-medium text-xs sm:hidden">Lively AI</span>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 sm:h-10 sm:w-10 rounded-full hover:bg-red-50 group"
                    onClick={async () => {
                      try {
                        if (window.confirm('Are you sure you want to clear the chat?')) {
                          setMessages([{
                            role: 'model',
                            parts: [{ text: defaultMessage || "Hello! How can I help you today?" }]
                          }]);

                          if (sessionId) {
                            await livelyService.deleteChatSession(sessionId);
                          } else {
                            await livelyService.clearConversationHistory();
                          }

                          toast({
                            title: "Chat Cleared",
                            description: "All messages have been cleared successfully.",
                            duration: 3000,
                          });

                          window.dispatchEvent(new CustomEvent('chat-updated'));
                        }
                      } catch (error) {
                        console.error('Error clearing chat:', error);
                        toast({
                          title: "Error",
                          description: "Failed to clear chat history. Please try again.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 group-hover:text-red-600 transition-colors" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Clear chat</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 rounded-full" onClick={toggleSearch}>
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 rounded-full">
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 rounded-full">
              <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col overflow-hidden p-0 
          h-[calc(100dvh-60px)] sm:h-[calc(94dvh-100px)]">
          {isSearching && (
            <div className="p-2 sm:p-3 border-b border-white/20 bg-white/40 backdrop-blur-[10px] flex-shrink-0">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  onClick={toggleSearch}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
          
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500/20 
            scrollbar-track-transparent hover:scrollbar-thumb-blue-500/30 
            transition-colors duration-200
            scroll-smooth">
            <div className="p-2 sm:p-4 space-y-2 sm:space-y-3 relative z-10">
              <AnimatePresence mode="popLayout">
                {(searchQuery ? filteredMessages : messages).map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ 
                      type: "spring",
                      stiffness: 500,
                      damping: 30,
                      mass: 1
                    }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-start space-x-1 sm:space-x-2 
                      max-w-[85%] sm:max-w-[80%] 
                      ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      <Avatar className="w-5 h-5 sm:w-8 sm:h-8 mt-0.5">
                        <AvatarImage 
                          src={message.role === 'user' ? "/assets/pritam-img.png" : "/assets/ai-icon.png"} 
                          alt={message.role === 'user' ? "User" : "AI"} 
                        />
                      </Avatar>
                      <div className="flex flex-col space-y-0.5">
                        <motion.div
                          initial={{ scale: 0.95 }}
                          animate={{ scale: 1 }}
                          className={`px-2.5 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl 
                            ${message.role === 'user' 
                              ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg' 
                              : 'bg-white/50 backdrop-blur-[10px] border border-white/20 text-gray-900'
                            }`}
                        >
                          <div className={`whitespace-pre-wrap break-words text-xs sm:text-sm ${
                            message.role === 'user' ? 'text-white/90' : ''
                          }`}>
                            {message.role === 'user' ? (
                              <div className="text-white leading-relaxed">{message.parts[0].text}</div>
                            ) : (
                              <div className="space-y-1">
                                <ReactMarkdown>{message.parts[0].text}</ReactMarkdown>
                              </div>
                            )}
                          </div>
                          <div className="flex justify-end mt-1.5">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-5 w-5 rounded-full 
                                      ${message.role === 'user' 
                                        ? 'text-white/70 hover:text-white hover:bg-white/10' 
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                                      } active:scale-95 transition-all duration-200`}
                                    onClick={() => copyToClipboard(message.parts[0].text, index)}
                                  >
                                    {copiedIndex === index ? (
                                      <Check className="h-3 w-3" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{copiedIndex === index ? 'Copied!' : 'Copy message'}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="flex justify-start"
                  >
                    <div className="flex items-center space-x-2 px-4 py-3 rounded-xl bg-white/50">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1, repeatDelay: 0.2 }}
                        className="w-2 h-2 bg-blue-500 rounded-full"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1, delay: 0.2, repeatDelay: 0.2 }}
                        className="w-2 h-2 bg-blue-500 rounded-full"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1, delay: 0.4, repeatDelay: 0.2 }}
                        className="w-2 h-2 bg-blue-500 rounded-full"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="border-t bg-transparent p-2 sm:p-4">
            <div className="max-w-2xl mx-auto">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 to-blue-500/20 
                    rounded-[2rem] blur opacity-75 group-hover:opacity-100 transition duration-300">
                  </div>
                  <div className="relative rounded-[2.5rem] overflow-hidden 
                    bg-white/10 backdrop-blur-md border border-white/20 
                    shadow-lg group-hover:shadow-xl transition-all duration-300">
                    <Textarea
                      ref={inputRef}
                      value={prompt}
                      onChange={(e) => {
                        setPrompt(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit(e);
                        }
                      }}
                      placeholder="Ask anything..."
                      className="w-full min-h-[60px] max-h-[200px] px-6 py-4 text-base
                        bg-transparent border-none focus:outline-none focus:ring-0
                        placeholder:text-gray-400 resize-none selection:bg-blue-200/30
                        [&:not(:focus)]:border-none [&:not(:focus)]:ring-0
                        focus-visible:ring-0 focus-visible:ring-offset-0"
                      style={{ 
                        height: 'auto',
                        overflowY: 'auto',
                        lineHeight: '1.5'
                      }}
                    />
                    
                    <div className="flex items-center justify-end p-3 
                      border-t border-white/10 bg-white/5">
                      <Button 
                        type="submit"
                        disabled={!prompt.trim() || isLoading}
                        className="rounded-xl bg-gradient-to-r from-purple-500 to-blue-500
                          hover:from-purple-600 hover:to-blue-600 text-white
                          shadow-lg hover:shadow-xl transition-all duration-300
                          transform hover:-translate-y-0.5 hover:scale-105
                          px-4 sm:px-6 py-2 text-sm font-medium"
                      >
                        <div className="flex items-center gap-2">
                          <Send className="w-4 h-4" />
                          <span className="hidden sm:inline">Send</span>
                        </div>
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 