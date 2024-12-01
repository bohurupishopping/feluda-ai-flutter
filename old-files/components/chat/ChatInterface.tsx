"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Search, Settings, MoreVertical, X, Copy, Check, Trash2, Save, BookOpen, Upload, Image as ImageIcon, File, RefreshCw, LineChart, BarChart4, TrendingUp } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { ConversationService } from '@/services/conversationService';
import { ModelSelector } from '@/components/chat/ModelSelector';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ReactMarkdown from 'react-markdown';
import { useAIGeneration } from './logic-ai-generation';
import { StoryCreationPopup } from './StoryCreationPopup';
import { StoryRewriterPopup } from './StoryRewriterPopup';
import { ChatMessage } from '@/services/conversationService';
import { SEOOptimizerPopup } from './SEOOptimizerPopup';
import { uploadAttachment } from '@/utils/attachmentUtils';
import { v4 as uuidv4 } from 'uuid';

interface Message {
  [x: string]: any;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  attachments?: string[];
}

interface ChatInterfaceProps {
  defaultMessage?: string;
  sessionId?: string;
  onModelChange?: (model: string) => void;
}

interface FileUpload {
  id: string;
  file: File;
  preview?: string;
  type: 'image' | 'document';
  uploading: boolean;
  url?: string;
  path?: string;
}

const stripHtmlAndFormatText = (html: string): string => {
  if (!html.includes('<')) return html;

  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  const processNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }
    
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      let text = Array.from(node.childNodes)
        .map(child => processNode(child))
        .join('');
      
      switch (element.tagName.toLowerCase()) {
        case 'h1': return `\n# ${text}\n`;
        case 'h2': return `\n## ${text}\n`;
        case 'h3': return `\n### ${text}\n`;
        case 'p': return `\n${text}\n`;
        case 'li': return `\n• ${text}`;
        case 'ul': return `\n${text}\n`;
        case 'ol': return `\n${text}\n`;
        case 'code': return `\`${text}\``;
        case 'pre': return `\n\`\`\`\n${text}\n\`\`\`\n`;
        case 'blockquote': return `\n> ${text}\n`;
        case 'br': return '\n';
        case 'div': return `\n${text}\n`;
        default: return text;
      }
    }
    return '';
  };
  
  let text = processNode(temp)
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+|\n+$/g, '')
    .trim();
  
  return text;
};

// Update the message container and text styling
const messageContainerStyles = `flex-1 overflow-y-auto
  scrollbar-thin scrollbar-thumb-black/10 dark:scrollbar-thumb-white/10
  scrollbar-track-transparent 
  px-2 sm:px-4 py-2 sm:py-4 
  space-y-2.5 sm:space-y-3.5 
  relative z-10
  overscroll-y-contain
  will-change-scroll`;

// Update the message styles with enhanced glassmorphism
const messageStyles = {
  user: `bg-blue-500/90 
    text-[0.925rem] sm:text-base leading-relaxed
    shadow-sm
    text-white/95 
    border border-blue-400/30
    dark:bg-blue-600/90 
    dark:border-blue-500/20`,
  assistant: `bg-white/50  
    text-[0.925rem] sm:text-base leading-relaxed
    border border-white/30 text-gray-800
    shadow-sm
    dark:bg-white/10 dark:border-white/10 dark:text-gray-100`
};

// Update the typing effect utilities
const typeText = async (
  text: string, 
  callback: (partial: string) => void, 
  speed: number = 1.5
) => {
  let partial = '';
  const tokens = text.split(/(\s+|\n|#{1,3}\s|`{1,3}|\*{1,2}|>|-)/).filter(Boolean);
  let buffer = '';
  
  const processChunk = async (startIndex: number, chunkSize: number): Promise<void> => {
    const endIndex = Math.min(startIndex + chunkSize, tokens.length);
    
    for (let i = startIndex; i < endIndex; i++) {
      partial += tokens[i];
      buffer += tokens[i];
    }

    callback(partial);

    if (endIndex < tokens.length) {
      await new Promise(resolve => setTimeout(resolve, 16)); // ~60fps
      return processChunk(endIndex, chunkSize);
    }
  };

  await processChunk(0, 3);
  callback(partial);
};

// Update the message animation for better performance
const messageAnimation = {
  initial: { 
    opacity: 0,
  },
  animate: { 
    opacity: 1,
    transition: {
      duration: 0.15,
    }
  },
  exit: { 
    opacity: 0,
    transition: {
      duration: 0.1,
    }
  }
} as const;

// Update the getMaxTokens function at the top of the file
const getMaxTokens = (model: string) => {
  if (model === 'gemini-1.5-pro') {
    return 1000000;
  }
  if (model === 'gemini-1.5-flash') {
    return 128000;
  }
  if (model === 'pixtral-large-latest') {
    return 128000;
  }
  return 8192; // default for other models
};

function ChatInterface({ defaultMessage, sessionId, onModelChange }: ChatInterfaceProps) {
  const [conversationService] = useState(() => new ConversationService(sessionId));
  const { selectedModel, setSelectedModel, generateContent } = useAIGeneration({ 
    conversationService,
    defaultModel: 'groq'
  });
  
  // When model changes, notify parent if callback exists
  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    if (onModelChange) {
      onModelChange(model);
    }
  };

  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: 'assistant',
    content: `# নমস্কার! 🙏

আমি ফেলুদা এ.আই। জ্ঞান আর মগজাস্ত্র নিয়ে তোমার কাছে এসেছি, লালমোহন বাবুর মতো গল্প বলার ক্ষমতা আমার নেই, কিন্তু টেলিপ‍্যাথির জোর আছে!

- 🔍 **Problem Solving** 
- 📚 **Knowledge Sharing** 
- 💡 **Creative Assistance**
- 🤝 **Thoughtful Discussions**

*"কোনো প্রশ্ন আছে?" - Do you have any questions?* 🕵️‍♂️`
  }]);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [attachments, setAttachments] = useState<FileUpload[]>([]);
  const [isStoryCreatorOpen, setIsStoryCreatorOpen] = useState(false);
  const [isStoryRewriterOpen, setIsStoryRewriterOpen] = useState(false);
  const [isSEOOptimizerOpen, setIsSEOOptimizerOpen] = useState(false);

  const inputAreaStyles = {
    wrapper: `relative flex flex-row items-start gap-2 max-w-2xl mx-auto`,
    attachmentsArea: `flex-shrink-0 w-[100px] sm:w-[120px] 
      overflow-y-auto max-h-[200px] rounded-xl
      bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm
      border border-green-100/20 dark:border-green-400/10
      p-1.5 space-y-1.5
      scrollbar-thin scrollbar-thumb-green-200/30 dark:scrollbar-thumb-green-400/10
      scrollbar-track-transparent
      transition-all duration-300
      ${attachments.length === 0 ? 'hidden' : ''}`,
    inputContainer: `flex-1 relative group min-w-0`
  } as const;

  useEffect(() => {
    if (messagesEndRef.current) {
      const scrollOptions: ScrollIntoViewOptions = {
        behavior: 'auto',
        block: 'end',
      };
      
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView(scrollOptions);
      });
    }
  }, [messages]);

  // Add new effect to load chat history when sessionId changes
  useEffect(() => {
    const loadChatHistory = async () => {
      if (sessionId) {
        try {
          const history = await conversationService.loadChatSession(sessionId);
          if (history.length > 0) {
            setMessages(history);
          }
        } catch (error) {
          console.error('Error loading chat history:', error);
          toast({
            title: "Error",
            description: "Failed to load chat history",
            variant: "destructive",
          });
        }
      }
    };

    loadChatHistory();
  }, [sessionId, conversationService]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newAttachments: FileUpload[] = [];
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'text/html',
      'text/css',
      'text/javascript',
      'application/x-javascript',
      'text/x-python',
      'text/md',
      'text/csv',
      'text/xml',
      'text/rtf'
    ];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported file type`,
          variant: "destructive"
        });
        continue;
      }

      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the 50MB limit`,
          variant: "destructive"
        });
        continue;
      }

      const isImage = file.type.startsWith('image/');
      
      const attachment: FileUpload = {
        id: uuidv4(),
        file,
        type: isImage ? 'image' : 'document',
        uploading: true
      };

      if (isImage) {
        attachment.preview = URL.createObjectURL(file);
      }

      newAttachments.push(attachment);
    }

    setAttachments(prev => [...prev, ...newAttachments]);

    // Upload files to Supabase
    try {
      for (const attachment of newAttachments) {
        const { url, path } = await uploadAttachment(attachment.file);
        
        setAttachments(prev => prev.map(att => 
          att.id === attachment.id 
            ? { ...att, url, path, uploading: false }
            : att
        ));
      }
    } catch (error) {
      console.error('Error uploading attachments:', error);
      toast({
        title: "Upload Error",
        description: "Failed to upload one or more files",
        variant: "destructive"
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => {
      const updated = prev.filter(att => att.id !== id);
      prev.forEach(att => {
        if (att.id === id && att.preview) {
          URL.revokeObjectURL(att.preview);
        }
      });
      return updated;
    });
  };

  const toggleSearch = () => {
    setIsSearching(!isSearching);
    setSearchQuery('');
  };

  const filteredMessages = messages.filter(message => 
    message.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const copyToClipboard = async (text: string, index: number) => {
    try {
      const formattedText = stripHtmlAndFormatText(text);
      await navigator.clipboard.writeText(formattedText);
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

  // Update the handleSubmit function
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!prompt.trim() && attachments.length === 0) || isLoading) return;

    // Get current attachments and file type
    const currentAttachments = attachments
      .filter(att => att.url)
      .map(att => att.url as string);

    const fileType = attachments.length > 0 ? attachments[0].type : undefined;

    // Add message to chat
    setMessages(prev => [...prev, {
      role: 'user' as const,
      content: prompt,
      attachments: currentAttachments,
      fileType
    }]);
    
    setPrompt('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await generateContent(prompt, attachments);
      
      if (response && typeof response === 'object' && 'content' in response) {
        setMessages(prev => [...prev, {
          role: 'assistant' as const,
          content: response.content,
          fileType: response.fileType
        }]);
      } else if (response) {
        // Handle legacy response format
        setMessages(prev => [...prev, {
          role: 'assistant' as const,
          content: response as string
        }]);
      }
    } catch (error) {
      console.error('Error generating response:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate response",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      setAttachments([]);
    }
  };

  // Optimize message rendering
  const MessageContent = React.memo(({ message }: { message: Message }) => {
    const hasAttachments = message.attachments && message.attachments.length > 0;
    const fileType = message.fileType;

    return (
      <div className="flex flex-col gap-2">
        {hasAttachments && fileType && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {fileType === 'document' ? (
              <File className="w-4 h-4" />
            ) : (
              <ImageIcon className="w-4 h-4" />
            )}
            <span>Attached {fileType}</span>
          </div>
        )}
        <ReactMarkdown
          components={{
            pre: ({ node, ...props }) => (
              <div className="overflow-x-auto max-w-full my-2">
                <pre {...props} className="p-3 rounded-xl bg-black/5" />
              </div>
            ),
            code: ({ node, ...props }) => (
              <code {...props} className="break-words" />
            )
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    );
  });

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden 
      px-2 sm:px-4 md:px-6 lg:px-8 py-0 sm:p-1 
      w-full max-w-[1600px] mx-auto">
      <Card className="flex-1 mx-0.5 my-0.5 sm:m-2 
        bg-white/40 dark:bg-gray-900/40 
        backdrop-blur-[12px] 
        rounded-2xl sm:rounded-[2rem] 
        border border-white/20 dark:border-white/10 
        shadow-lg
        relative flex flex-col overflow-hidden
        w-full max-w-[1400px] mx-auto
        h-[calc(100dvh-20px)] sm:h-[calc(98dvh-16px)]
        transform-gpu">
        
        <div className="absolute inset-0 rounded-[2rem] sm:rounded-[2.5rem]
          bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 
          dark:from-blue-400/20 dark:via-purple-400/20 dark:to-pink-400/20
          opacity-50
          pointer-events-none">
        </div>

        <CardHeader 
          className="border-b border-white/20 dark:border-white/10 
            px-2 sm:px-6 py-1.5 sm:py-3
            flex flex-row justify-between items-center 
            bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl
            relative z-10
            h-auto sm:h-auto flex-shrink-0
            motion-safe:transition-colors motion-safe:duration-300"
        >
          <div className="flex items-center space-x-2">
            <Avatar className="w-6 h-6 sm:w-10 sm:h-10">
              <AvatarImage src="/assets/ai.png" alt="AI Avatar" />
            </Avatar>
            <span className="font-medium text-xs sm:text-base hidden sm:inline">FeludaAI : Your Ultimate Magajastra</span>
            <span className="font-medium text-xs sm:hidden">FeludaAI</span>
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
                        // Show confirmation dialog
                        if (window.confirm('Are you sure you want to clear this chat?')) {
                          // Clear messages from UI
                          setMessages([{
                            role: 'assistant',
                            content: `# নমস্কার! 🙏

আমি ফেলুদা এ.আই। জ্ঞান আর মগজাস্ত্র নিয়ে তোমার কাছে এসেছি, লালমোহন বাবুর মতো গল্প বলার ক্ষমতা আমার নেই, কিন্তু টেলিপ‍্যাথির জোর আছে!

- 🔍 **Problem Solving** 
- 📚 **Knowledge Sharing** 
- 💡 **Creative Assistance**
- 🤝 **Thoughtful Discussions**

*"কোনো প্রশ্ন আছে?" - Do you have any questions?* 🕵️‍♂️`
                          }]);

                          // If we have a sessionId, only delete that specific session
                          if (sessionId) {
                            await conversationService.deleteChatSession(sessionId);
                            toast({
                              title: "Chat Cleared",
                              description: "This chat session has been cleared successfully.",
                              duration: 3000,
                            });
                          } else {
                            // If no sessionId (new chat), just clear the UI
                            toast({
                              title: "Chat Cleared",
                              description: "Messages have been cleared from this chat.",
                              duration: 3000,
                            });
                          }

                          // Dispatch event to update any other components
                          window.dispatchEvent(new CustomEvent('chat-updated'));
                        }
                      } catch (error) {
                        console.error('Error clearing chat:', error);
                        toast({
                          title: "Error",
                          description: "Failed to clear chat. Please try again.",
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
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 rounded-full" onClick={() => setIsStoryCreatorOpen(true)}>
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 rounded-full" onClick={() => setIsStoryRewriterOpen(true)}>
              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 rounded-full" onClick={() => setIsSEOOptimizerOpen(true)}>
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
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
          
          <div className={messageContainerStyles}>
            <AnimatePresence initial={false}>
              {(searchQuery ? filteredMessages : messages).map((message, index) => (
                <motion.div
                  key={index}
                  {...messageAnimation}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} 
                    transform-gpu will-change-transform`}
                  layout={false}
                >
                  <div className={`flex items-start space-x-1.5 sm:space-x-2 
                    max-w-[88%] sm:max-w-[80%] lg:max-w-[75%]
                    ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}
                    group-hover/message:translate-y-[-1px] transition-transform duration-200`}>
                    <Avatar className="w-6 h-6 sm:w-8 sm:h-8 mt-0.5 flex-shrink-0">
                      <AvatarImage 
                        src={message.role === 'user' ? "/assets/pritam-img.png" : "/assets/ai-icon.png"} 
                        alt={message.role === 'user' ? "User" : "AI"}
                        className="object-cover"
                      />
                    </Avatar>
                    
                    <motion.div
                      initial={{ scale: 0.95 }}
                      animate={{ scale: 1 }}
                      className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl sm:rounded-2xl 
                        break-words overflow-hidden
                        ${messageStyles[message.role]}`}
                    >
                      <div className="overflow-x-auto">
                        {message.role === 'user' ? (
                          <div className="leading-relaxed">
                            {message.content}
                          </div>
                        ) : (
                          <MessageContent message={message} />
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
                                onClick={() => copyToClipboard(message.content, index)}
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
                </motion.div>
              ))}
            </AnimatePresence>
            
            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex justify-start"
              >
                <div className="flex items-center space-x-2 px-4 py-3 rounded-xl 
                  bg-white/60 backdrop-blur-[8px] border border-white/30
                  shadow-sm">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 1,
                        delay: i * 0.2,
                        ease: "easeInOut"
                      }}
                      className="w-2 h-2 bg-blue-500/80 rounded-full"
                    />
                  ))}
                </div>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} className="scroll-mt-[100px]" />
          </div>

          <div className="border-t border-white/10 bg-transparent p-1 sm:p-2">
            <form onSubmit={handleSubmit} className="space-y-2">
              <div className={inputAreaStyles.wrapper}>
                {/* Attachments Area - Left Side */}
                <div className={inputAreaStyles.attachmentsArea}>
                  {attachments.map((attachment) => (
                    <div key={attachment.id} 
                      className="relative group/attachment 
                        flex items-center w-full h-[90px] sm:h-[100px]
                        bg-white/30 dark:bg-gray-800/30 
                        rounded-lg p-1.5
                        ring-1 ring-green-100/30 dark:ring-green-400/20
                        shadow-sm hover:shadow-md
                        transform hover:scale-[1.02] 
                        transition-all duration-200">
                      {attachment.type === 'image' && attachment.preview && (
                        <div className="relative w-[70px] h-[70px] sm:w-[80px] sm:h-[80px]
                          mx-auto overflow-hidden">
                          <img 
                            src={attachment.preview} 
                            alt="Attachment preview" 
                            className="w-full h-full object-cover rounded-md"
                          />
                        </div>
                      )}
                      {attachment.type === 'document' && (
                        <div className="w-[70px] h-[70px] sm:w-[80px] sm:h-[80px]
                          mx-auto
                          bg-white/80 dark:bg-gray-800/80 
                          rounded-md flex flex-col items-center justify-center
                          gap-1">
                          <File className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center px-1 truncate max-w-full">
                            {attachment.file.name}
                          </p>
                        </div>
                      )}
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-gray-400">
                        {Math.round(attachment.file.size / 1024)}KB
                      </div>
                      {attachment.uploading ? (
                        <div className="absolute inset-0 bg-black/50 rounded-lg
                          flex items-center justify-center backdrop-blur-sm">
                          <RefreshCw className="w-4 h-4 text-white animate-spin" />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => removeAttachment(attachment.id)}
                          className="absolute -top-1 -right-1 
                            bg-red-500/90 hover:bg-red-500
                            text-white rounded-full p-1
                            opacity-0 scale-75
                            group-hover/attachment:opacity-100 
                            group-hover/attachment:scale-100
                            shadow-sm hover:shadow-md
                            transition-all duration-200
                            z-10">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Input Area - Right Side */}
                <div className={inputAreaStyles.inputContainer}>
                  <div className="absolute -inset-1 bg-gradient-to-r from-green-400/20 via-emerald-400/20 to-teal-400/20 
                    dark:from-green-300/30 dark:via-emerald-300/30 dark:to-teal-300/30
                    rounded-[1.5rem] blur-xl opacity-70 group-hover:opacity-100 
                    transition-all duration-500">
                  </div>
                  <div className="relative rounded-[1.5rem] overflow-hidden 
                    bg-gradient-to-br from-green-50/90 to-emerald-50/90
                    dark:from-green-900/20 dark:to-emerald-900/20 backdrop-blur-xl 
                    border border-green-100/20 dark:border-green-400/10 
                    shadow-lg hover:shadow-xl 
                    transition-all duration-300">
                    
                    <div className="absolute top-1.5 left-1/2 transform -translate-x-1/2 z-10">
                      <ModelSelector 
                        onModelChange={handleModelChange}
                        compact={true}
                        isChatMode={true}
                      />
                    </div>

                    <Textarea
                      ref={inputRef}
                      value={prompt}
                      onChange={(e) => {
                        setPrompt(e.target.value);
                        const element = e.target;
                        requestAnimationFrame(() => {
                          element.style.height = 'auto';
                          const scrollHeight = Math.max(45, element.scrollHeight);
                          element.style.height = `${Math.min(scrollHeight, 300)}px`;
                        });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit(e);
                        }
                      }}
                      placeholder="Type a message..."
                      className="w-full min-h-[45px] max-h-[300px] px-4 py-2.5
                        mt-[2.75rem] 
                        bg-transparent border-none focus:outline-none focus:ring-0
                        placeholder:text-gray-400/70 resize-none selection:bg-green-200/30
                        [&:not(:focus)]:border-none [&:not(:focus)]:ring-0
                        focus-visible:ring-0 focus-visible:ring-offset-0
                        text-gray-700 dark:text-gray-200
                        overflow-y-auto scrollbar-thin scrollbar-thumb-green-200/30 
                        dark:scrollbar-thumb-green-400/10 scrollbar-track-transparent"
                      style={{ 
                        height: '45px',
                        lineHeight: '1.5'
                      }}
                    />
                    
                    <div className="flex items-center justify-center p-1 sm:p-1.5 
                      border-t border-green-100/20 bg-gradient-to-b from-transparent to-green-50/5 
                      dark:to-green-900/5 backdrop-blur-sm">
                      <div className="flex items-center justify-center w-full gap-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="rounded-xl bg-green-100/30
                            dark:bg-green-900/20
                            flex items-center gap-2 text-sm
                            border border-green-100/20 dark:border-green-400/10
                            shadow-sm h-9 px-4
                            text-gray-700 dark:text-gray-200"
                        >
                          <ImageIcon className="w-4 h-4" />
                          <span>Attach</span>
                        </Button>

                        <Button 
                          type="submit"
                          disabled={!prompt.trim() && attachments.length === 0 || isLoading}
                          className="rounded-xl bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400
                            disabled:from-gray-400 disabled:to-gray-500
                            text-white font-medium shadow-lg
                            h-9 px-4 text-sm
                            border border-green-100/20"
                        >
                          <div className="flex items-center gap-2">
                            {isLoading ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                            <span>
                              {isLoading ? "Sending..." : "Send"}
                            </span>
                          </div>
                        </Button>
                      </div>
                    </div>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.txt"
                    />
                  </div>
                </div>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
      <>
        <StoryCreationPopup 
          isOpen={isStoryCreatorOpen}
          onClose={() => setIsStoryCreatorOpen(false)}
          onSubmit={(prompt: string) => {
            setPrompt(prompt);
            handleSubmit(new Event('submit') as any);
          }}
        />
        <StoryRewriterPopup
          isOpen={isStoryRewriterOpen}
          onClose={() => setIsStoryRewriterOpen(false)}
          onSubmit={(prompt: string) => {
            setPrompt(prompt);
            handleSubmit(new Event('submit') as any);
          }}
        />
        <SEOOptimizerPopup
          isOpen={isSEOOptimizerOpen}
          onClose={() => setIsSEOOptimizerOpen(false)}
          onSubmit={(prompt: string) => {
            setPrompt(prompt);
            handleSubmit(new Event('submit') as any);
          }}
        />
      </>
    </div>
  );
}

// Memoize the entire component
export default React.memo(ChatInterface);