"use client";

import React, { useState, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Upload, File, RefreshCw, X, ChevronRight, BookOpen, BrainCircuit, Languages, GitCompare
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { useDocumentAI } from '@/components/document/logic-document-ai';
import { FileUpload } from '@/types/conversation';
import { uploadAttachment } from '@/utils/attachmentUtils';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import Sidebar from '@/components/shared/Sidebar';

// Loading component
const LoadingState = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
  </div>
);

// Add new interface for predefined options
interface FeatureOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
}

// Main component
const DocumentAIContent: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [prompt, setPrompt] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [attachments, setAttachments] = useState<FileUpload[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const welcomeFileInputRef = useRef<HTMLInputElement>(null);
  const enhancedFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { processDocument } = useDocumentAI({
    defaultModel: 'gemini-1.5-flash'
  });
  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  // Predefined options
  const featureOptions: FeatureOption[] = [
    {
      id: 'summary',
      title: 'Document Summary',
      description: 'Get a quick overview of your document content',
      icon: <BookOpen className="w-6 h-6 text-blue-500" />,
      action: () => {
        setPrompt("Please provide a comprehensive summary of this document.");
      }
    },
    {
      id: 'qa',
      title: 'Smart Q&A',
      description: 'Ask specific questions about your document',
      icon: <BrainCircuit className="w-6 h-6 text-purple-500" />,
      action: () => {
        setPrompt("What are the main points discussed in this document?");
      }
    },
    {
      id: 'translate',
      title: 'Doc Translation',
      description: 'Translate your document to another language',
      icon: <Languages className="w-6 h-6 text-green-500" />,
      action: () => {
        setPrompt("Please translate this document to English.");
      }
    },
    {
      id: 'compare',
      title: 'Comparison',
      description: 'Compare different sections of your document',
      icon: <GitCompare className="w-6 h-6 text-orange-500" />,
      action: () => {
        setPrompt("Please compare the main sections of this document.");
      }
    }
  ];

  // Add drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files?.length > 0) {
      handleFiles(Array.from(files));
    }
  };

  // Separate file handling logic
  const handleFiles = async (files: File[]) => {
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

    for (const file of files) {
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
      
      const newAttachment: FileUpload = {
        id: uuidv4(),
        file,
        type: isImage ? 'image' : 'document',
        uploading: true
      };

      if (isImage) {
        newAttachment.preview = URL.createObjectURL(file);
      }

      newAttachments.push(newAttachment);
    }

    if (newAttachments.length > 0) {
      setAttachments(prev => [...prev, ...newAttachments]);
      setShowWelcome(false);

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
    }
  };

  // Modified handleFileSelect
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    await handleFiles(Array.from(files));

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (welcomeFileInputRef.current) {
      welcomeFileInputRef.current.value = '';
    }
    if (enhancedFileInputRef.current) {
      enhancedFileInputRef.current.value = '';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!prompt.trim() && attachments.length === 0) || isLoading) return;

    setIsLoading(true);

    try {
      const response = await processDocument(prompt, attachments, 'chat');
      
      if (response && typeof response === 'object' && 'content' in response) {
        setResult(response.content);
      }
    } catch (error) {
      console.error('Error processing document:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process document",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeatureSelect = (option: FeatureOption) => {
    setSelectedFeature(option.id);
    option.action();
    fileInputRef.current?.click();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[conic-gradient(at_top,_var(--tw-gradient-stops))] 
      from-sky-50 via-indigo-50 to-emerald-50 
      dark:from-gray-900 dark:via-purple-900 dark:to-gray-900">
      <Sidebar isOpen={true} onToggle={() => {}} />

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Welcome Section */}
        <AnimatePresence>
          {showWelcome && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 overflow-auto px-4 sm:px-6 py-8"
            >
              <div className="max-w-4xl mx-auto">
                {/* Welcome Header */}
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 
                    bg-clip-text text-transparent mb-3">
                    Chat with Your Documents
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300">
                    Upload your documents and start analyzing them with AI
                  </p>
                </div>

                {/* Upload Section */}
                <div 
                  className="relative group cursor-pointer mb-8"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => welcomeFileInputRef.current?.click()}
                >
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    className="relative"
                  >
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 
                      rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-200" />
                    <div className="relative bg-white/80 dark:bg-gray-800/80 rounded-xl p-8
                      border border-white/20 dark:border-white/10 backdrop-blur-xl
                      flex flex-col items-center justify-center gap-4
                      group-hover:shadow-lg transition-all duration-300">
                      <div className="p-4 rounded-full bg-blue-500/10 group-hover:scale-110 transition-transform duration-300">
                        <Upload className="w-8 h-8 text-blue-500" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          PDF, DOC, TXT, Images (max. 50MB)
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Hidden file input for Welcome Section */}
                <input
                  type="file"
                  ref={welcomeFileInputRef}
                  className="hidden"
                  onChange={handleFileSelect}
                  multiple
                  accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/html,text/css,text/javascript,application/x-javascript,text/x-python,text/md,text/csv,text/xml,text/rtf"
                />

                {/* Feature Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {featureOptions.map((option) => (
                    <motion.div
                      key={option.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleFeatureSelect(option)}
                      className={`
                        relative group cursor-pointer
                        ${selectedFeature === option.id ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}
                      `}
                    >
                      <div className={`
                        absolute -inset-0.5 
                        bg-gradient-to-r 
                        ${selectedFeature === option.id 
                          ? 'from-blue-500/30 to-purple-500/30 opacity-100' 
                          : 'from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100'
                        }
                        rounded-xl blur transition duration-200
                      `} />
                      <div className={`
                        relative bg-white/60 dark:bg-gray-800/60 rounded-lg p-4
                        border border-white/20 dark:border-white/10 backdrop-blur-xl
                        flex items-start gap-4 
                        ${selectedFeature === option.id 
                          ? 'shadow-lg border-blue-200/50 dark:border-blue-500/30' 
                          : 'group-hover:shadow-md'
                        }
                        transition-all duration-300
                      `}>
                        <div className={`
                          p-3 rounded-lg 
                          ${selectedFeature === option.id
                            ? 'bg-blue-500/10 dark:bg-blue-500/20'
                            : 'bg-white/80 dark:bg-gray-700/80'
                          }
                          shadow-sm transition-colors duration-300
                        `}>
                          {option.icon}
                        </div>
                        <div>
                          <h3 className={`
                            font-medium mb-1
                            ${selectedFeature === option.id
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-gray-900 dark:text-gray-100'
                            }
                            transition-colors duration-300
                          `}>
                            {option.title}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {option.description}
                          </p>
                          {selectedFeature === option.id && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="mt-2 flex items-center gap-1.5 text-xs text-blue-500"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                              <span>Selected</span>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Existing Chat Area - Only show when welcome is hidden */}
        {!showWelcome && (
          <>
            {/* Main Chat Area with better spacing */}
            <div className="flex-1 overflow-auto px-4 sm:px-6">
              <div className="max-w-4xl mx-auto py-4 space-y-4">
                {/* File Preview Section */}
                <AnimatePresence>
                  {attachments.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="bg-gradient-to-br from-white/70 via-white/50 to-white/30 
                        dark:from-gray-800/70 dark:via-gray-800/50 dark:to-gray-800/30 
                        rounded-3xl overflow-hidden border border-white/20 dark:border-white/10 
                        shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl"
                    >
                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500/20 to-emerald-500/20">
                            <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                          </div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            Uploaded Files ({attachments.length})
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {attachments.map((attachment) => (
                            <motion.div
                              key={attachment.id}
                              layout
                              initial={{ scale: 0.95, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.95, opacity: 0 }}
                              whileHover={{ scale: 1.02, translateY: -2 }}
                              className="group relative bg-white/80 dark:bg-gray-700/50 
                                rounded-2xl overflow-hidden border border-white/20 dark:border-white/10
                                hover:shadow-lg hover:border-sky-100 dark:hover:border-sky-500/30
                                transition-all duration-200"
                            >
                              <div className="aspect-[4/3] relative">
                                {attachment.type === 'image' && attachment.preview ? (
                                  <img 
                                    src={attachment.preview} 
                                    alt={`Preview of ${attachment.file.name}`}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center p-3">
                                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500/20 to-emerald-500/20 mb-2">
                                      {attachment.file.name.toLowerCase().endsWith('.pdf') ? (
                                        <FileText className="w-5 h-5 text-red-500 dark:text-red-400" />
                                      ) : (
                                        <File className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-300 text-center truncate max-w-[90%]">
                                      {attachment.file.name}
                                    </p>
                                  </div>
                                )}
                                
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => removeAttachment(attachment.id)}
                                  className="absolute top-2 right-2 p-1.5 rounded-full
                                    bg-black/20 hover:bg-red-500 text-white
                                    opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100
                                    backdrop-blur-sm transition-all duration-200"
                                  aria-label={`Remove ${attachment.file.name}`}
                                >
                                  <X className="w-3 h-3" />
                                </motion.button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Processing Animation */}
                <AnimatePresence>
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="flex flex-col items-center justify-center p-8 text-center"
                    >
                      <div className="relative">
                        <div className="absolute inset-0 rounded-full blur-xl bg-gradient-to-r from-sky-400 to-emerald-400 opacity-20 animate-pulse" />
                        <div className="relative p-4 rounded-full bg-gradient-to-r from-sky-500/20 to-emerald-500/20 
                          border border-white/20 backdrop-blur-xl">
                          <RefreshCw className="w-6 h-6 text-sky-600 dark:text-sky-400 animate-spin" />
                        </div>
                      </div>
                      <p className="mt-4 text-sm text-gray-600 dark:text-gray-300 animate-pulse">
                        Processing your request...
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Chat Messages with updated styling */}
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-white/70 to-white/50 
                      dark:from-gray-800/70 dark:to-gray-800/50 
                      rounded-3xl p-6 backdrop-blur-xl border border-white/20 
                      dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]
                      sm:mx-0 mx-2"
                  >
                    <div className="prose dark:prose-invert max-w-none">
                      <ReactMarkdown>{result}</ReactMarkdown>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Enhanced Input Area */}
            <div className="flex-none p-3 sm:p-4">
              <div className="max-w-4xl mx-auto space-y-3">
                {/* Quick Feature Options */}
                <div className="flex items-center gap-2 px-1">
                  {featureOptions.map((option) => (
                    <motion.button
                      key={option.id}
                      onClick={() => {
                        setSelectedFeature(option.id);
                        option.action();
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`
                        flex items-center gap-2 py-1.5 px-3 rounded-xl text-xs
                        ${selectedFeature === option.id 
                          ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-200/50' 
                          : 'bg-white/50 hover:bg-gray-100/50 border-white/20'
                        }
                        border backdrop-blur-sm transition-all duration-200
                      `}
                    >
                      <div className={`
                        ${selectedFeature === option.id
                          ? 'text-blue-500'
                          : 'text-gray-500'
                        }
                      `}>
                        {option.icon}
                      </div>
                      <span className={`
                        font-medium
                        ${selectedFeature === option.id
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-600 dark:text-gray-400'
                        }
                      `}>
                        {option.title}
                      </span>
                    </motion.button>
                  ))}
                </div>

                {/* Input Area */}
                <div className="relative group">
                  {/* Subtle gradient border effect */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-500 via-emerald-500 to-teal-500 
                    rounded-[20px] blur opacity-10 group-hover:opacity-20 transition duration-200" />

                  <div className="relative bg-white/80 dark:bg-gray-900/80 rounded-[18px]
                    shadow-[0_4px_20px_-2px_rgba(0,0,0,0.04)] backdrop-blur-xl 
                    border border-white/20 dark:border-white/10 overflow-hidden">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-3">
                      {/* Text Input Area with Border */}
                      <div className="relative group">
                        <Textarea
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
                          placeholder="Ask questions about your document..."
                          className="w-full min-h-[44px] max-h-[150px] py-2.5 px-3 rounded-xl
                            bg-white/50 dark:bg-gray-800/50
                            border border-gray-200/50 dark:border-gray-700/50
                            focus:border-sky-200 dark:focus:border-sky-500/30
                            placeholder:text-gray-400 dark:placeholder:text-gray-500
                            text-gray-700 dark:text-gray-200
                            focus:ring-2 focus:ring-sky-500/20
                            shadow-[0_2px_8px_rgb(0,0,0,0.02)]
                            resize-none transition-all duration-200
                            text-sm
                            relative z-0
                            group-hover:bg-white/70 dark:group-hover:bg-gray-800/70
                            group-hover:border-sky-200/50 dark:group-hover:border-sky-500/40"
                        />
                        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-sky-500/5 via-emerald-500/5 to-teal-500/5 
                          rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      </div>

                      {/* Compact Actions Bar */}
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-200/10 dark:border-gray-700/10">
                        {/* Enhanced Upload Button */}
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => enhancedFileInputRef.current?.click()}
                          className="relative group cursor-pointer"
                        >
                          <button
                            type="button"
                            className="flex items-center gap-2 py-1.5 px-3 rounded-xl text-xs
                              bg-white/50 hover:bg-gray-100/50 border-white/20
                              border backdrop-blur-sm transition-all duration-200"
                          >
                            <Upload className="w-4 h-4 text-gray-500" />
                            <span className="font-medium text-gray-600 dark:text-gray-400">
                              Upload
                            </span>
                          </button>
                        </motion.div>

                        {/* Hidden file input for Enhanced Input Area */}
                        <input
                          type="file"
                          ref={enhancedFileInputRef}
                          className="hidden"
                          onChange={handleFileSelect}
                          multiple
                          accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/html,text/css,text/javascript,application/x-javascript,text/x-python,text/md,text/csv,text/xml,text/rtf"
                        />

                        <div className="flex-1" />

                        {/* Processing Status */}
                        {isLoading && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Processing...</span>
                          </div>
                        )}

                        {/* Send Button */}
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button 
                            type="submit"
                            size="sm"
                            disabled={(!prompt.trim() && attachments.length === 0) || isLoading}
                            className="flex items-center gap-2 py-2 px-4 rounded-xl
                              bg-gradient-to-r from-sky-500 via-emerald-500 to-teal-500
                              hover:from-sky-600 hover:via-emerald-600 hover:to-teal-600
                              disabled:from-gray-300 disabled:to-gray-400
                              dark:disabled:from-gray-700 dark:disabled:to-gray-800
                              text-white shadow-[0_4px_16px_-4px_rgba(0,0,0,0.1)]
                              disabled:shadow-none
                              transition-all duration-300"
                          >
                            <span className="text-xs font-medium">Send</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        </motion.div>
                      </div>
                    </form>
                  </div>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  multiple
                  accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/html,text/css,text/javascript,application/x-javascript,text/x-python,text/md,text/csv,text/xml,text/rtf"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Page component with Suspense
const DocumentAI: React.FC = () => {
  return (
    <Suspense fallback={<LoadingState />}>
      <DocumentAIContent />
    </Suspense>
  );
};

export default DocumentAI; 