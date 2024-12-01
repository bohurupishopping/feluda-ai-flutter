"use client";

import { useState, Suspense, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ImageIcon, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import Sidebar from '@/components/shared/Sidebar';
import ImageOptionsMenu from '@/components/imagine/ImageOptionsMenu';
import Image from 'next/image';
import ImagePreview from '@/components/imagine/ImagePreview';
import { ImageHistoryService, type ImageSession } from '@/services/imageHistoryService';
import { useInView } from 'react-intersection-observer';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import ImageTypeSelector from '@/components/imagine/ImageTypeSelector';
import ModelSelector from '@/components/imagine/ModelSelector';
import SizeSelector from '@/components/imagine/SizeSelector';

// Optimize image variants for smoother performance
const imageVariants = {
  hidden: { 
    opacity: 0,
    scale: 0.98
  },
  visible: { 
    opacity: 1,
    scale: 1,
    transition: { 
      duration: 0.2,
      ease: "easeOut"
    }
  },
  exit: { 
    opacity: 0,
    scale: 0.98,
    transition: { 
      duration: 0.15,
      ease: "easeIn"
    }
  },
  hover: {
    y: -2,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20
    }
  }
};

// Optimize loading variants
const loadingVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { 
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  },
  exit: { 
    opacity: 0,
    scale: 0.98,
    transition: {
      duration: 0.15,
      ease: "easeIn"
    }
  }
};

function ImagineContent() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedModel, setSelectedModel] = useState('black-forest-labs/FLUX.1-schnell-Free');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [selectedSize, setSelectedSize] = useState('1024x1024');
  const { toast } = useToast();
  const imageHistoryServiceRef = useRef(ImageHistoryService.getInstance());
  const [historyImages, setHistoryImages] = useState<ImageSession[]>([]);
  const [selectedImagePrompt, setSelectedImagePrompt] = useState<string>('');
  const [visibleImages, setVisibleImages] = useState(6);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState('(photorealistic:1.4), (hyperrealistic:1.3), masterpiece, professional photography, 8k resolution, highly detailed, sharp focus, HDR, high contrast, cinematic lighting, volumetric lighting, ambient occlusion, ray tracing, professional color grading, dramatic atmosphere, shot on Hasselblad H6D-400C, 100mm f/2.8 lens, golden hour photography, detailed textures, intricate details, pristine quality, award-winning photography');

  // Add scroll container ref
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Optimize scroll behavior
  const smoothScrollToTop = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'auto'
      });
    }
  }, []);

  // Optimize image loading with intersection observer
  const { ref: gridRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
    rootMargin: '100px'
  });

  // Optimize load more images function
  const loadMoreImages = useCallback(() => {
    setIsLoadingMore(true);
    setVisibleImages(prev => prev + 6);
    requestAnimationFrame(() => {
      setIsLoadingMore(false);
    });
  }, []);

  useEffect(() => {
    loadImageHistory();
    
    const handleHistoryUpdate = () => {
      loadImageHistory();
    };
    
    window.addEventListener('image-history-updated', handleHistoryUpdate);
    return () => {
      window.removeEventListener('image-history-updated', handleHistoryUpdate);
    };
  }, []);

  const loadImageHistory = async () => {
    try {
      const history = await imageHistoryServiceRef.current.getImageHistory();
      setHistoryImages(history);
    } catch (error) {
      console.error('Error loading image history:', error);
      toast({
        title: "Error",
        description: "Failed to load image history",
        variant: "destructive",
      });
    }
  };

  const handleEnhancePrompt = async () => {
    if (!prompt.trim() || isEnhancing) return;

    setIsEnhancing(true);
    try {
      const response = await fetch('/api/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt,
          styleType: selectedStyle,
          size: selectedSize
        }),
      });

      const data = await response.json();
      if (data.success && data.enhancedPrompt) {
        setPrompt(data.enhancedPrompt);
        toast({
          title: "Prompt Enhanced",
          description: "Your prompt has been enhanced for better results",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to enhance prompt",
        variant: "destructive",
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setIsPreloading(true);
    
    // Start smooth scroll
    smoothScrollToTop();

    try {
      // Make API request immediately without delay
      const response = await fetch('/api/imagine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `${prompt}, ${selectedStyle}`,
          model: selectedModel,
          size: selectedSize,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      if (data.success && data.data[0]?.url) {
        const imageUrl = data.data[0].url;
        
        // Preload image and update state simultaneously
        await Promise.all([
          new Promise<void>((resolve, reject) => {
            const img = document.createElement('img');
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = imageUrl;
          }),
          imageHistoryServiceRef.current.saveImage(prompt, imageUrl)
        ]);

        // Update states after both image preload and save are complete
        setGeneratedImage(imageUrl);
        await loadImageHistory();
        
        // Ensure minimum 6 visible images
        setVisibleImages(prev => Math.max(prev, 6));
        
        toast({
          title: "Success",
          description: "Image generated successfully!",
        });
      } else {
        throw new Error('No image URL received');
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate image",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsPreloading(false);
    }
  };

  const handleDeleteImage = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      toast({
        title: "Deleting...",
        description: "Please wait while we delete the image",
      });

      const imageToDelete = historyImages.find(img => img.id === id);
      
      await imageHistoryServiceRef.current.deleteImage(id);

      if (imageToDelete && selectedImage === imageToDelete.image_url) {
        setSelectedImage(null);
        setSelectedImagePrompt('');
      }

      toast({
        title: "Success",
        description: "Image deleted successfully",
      });

      await loadImageHistory();
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        title: "Error",
        description: "Failed to delete image",
        variant: "destructive",
      });
    }
  };

  // Optimize image loading with virtualization
  const virtualizedImages = useCallback(() => {
    return historyImages.slice(0, visibleImages).map((imageSession, index) => {
      const isVisible = index < visibleImages;
      const isPriority = index < 4;
      
      return (
        <m.div
          key={`history-${imageSession.id}`}
          variants={imageVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          whileHover="hover"
          layout="position"
          layoutId={`image-${imageSession.id}`}
          className="relative aspect-square rounded-2xl overflow-hidden
            shadow-lg hover:shadow-xl 
            bg-white/50 backdrop-blur-sm border border-white/20
            cursor-pointer group transform-gpu will-change-transform"
          onClick={() => {
            setSelectedImage(imageSession.image_url);
            setSelectedImagePrompt(imageSession.prompt);
          }}
        >
          {isVisible && (
            <>
              <div className="absolute inset-0 bg-gray-100 animate-pulse" />
              <Image
                src={imageSession.image_url}
                alt={`Generated image ${index + 1}`}
                fill
                priority={isPriority}
                className="object-contain bg-black/50"
                sizes="(max-width: 768px) 45vw, (max-width: 1200px) 30vw, 23vw"
                loading={isPriority ? "eager" : "lazy"}
                quality={isPriority ? 85 : 70}
                onLoad={(e) => {
                  const img = e.target as HTMLImageElement;
                  if (img.naturalWidth > img.naturalHeight) {
                    img.classList.remove('object-contain');
                    img.classList.add('object-cover');
                  }
                }}
              />
              
              <m.div 
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 
                  transition-opacity duration-200"
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-red-500/80 hover:bg-red-600
                    shadow-lg backdrop-blur-sm"
                  onClick={(e) => handleDeleteImage(imageSession.id, e)}
                >
                  <Trash2 className="h-4 w-4 text-white" />
                </Button>
              </m.div>
            </>
          )}
        </m.div>
      );
    });
  }, [historyImages, visibleImages, handleDeleteImage]);

  // Optimize scroll behavior with throttling
  const throttledLoadMore = useCallback(() => {
    if (!isLoadingMore) {
      requestAnimationFrame(() => {
        loadMoreImages();
      });
    }
  }, [isLoadingMore, loadMoreImages]);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-gradient-to-br from-purple-100 via-blue-100 to-pink-100">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
      />
      <main className="flex-1 overflow-hidden">
        <div className="h-[100dvh] flex flex-col overflow-hidden 
          px-3 sm:px-4 md:px-6 lg:px-8 py-0 sm:p-1 
          w-full max-w-[1600px] mx-auto">
          <Card className="flex-1 mx-0.5 my-0.5 sm:m-2 
            bg-white/60 backdrop-blur-[12px] 
            rounded-2xl sm:rounded-[2rem] 
            border border-white/20 
            shadow-lg
            relative flex flex-col overflow-hidden
            w-full max-w-[1400px] mx-auto
            h-[calc(100dvh-20px)] sm:h-[calc(98dvh-16px)]
            transform-gpu">
            
            <div className="absolute inset-0 rounded-[2rem] sm:rounded-[2.5rem]">
              <div className="absolute inset-0 rounded-[2rem] sm:rounded-[2.5rem] 
                bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 
                blur-2xl opacity-40" />
            </div>

            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto overflow-x-hidden p-4 relative z-10
                scrollbar-thin scrollbar-thumb-black/10 scrollbar-track-transparent
                overscroll-bounce"
            >
              <LazyMotion features={domAnimation} strict>
                <m.div 
                  ref={gridRef}
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-7xl mx-auto"
                >
                  {isLoading && (
                    <m.div
                      variants={loadingVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="relative aspect-square rounded-2xl overflow-hidden
                        shadow-lg bg-white/50 backdrop-blur-sm border border-white/20
                        flex items-center justify-center col-span-1 row-start-1
                        transform-gpu"
                    >
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                        <RefreshCw className="w-8 h-8 text-gray-400/80 animate-spin" />
                        <div className="mt-4 text-sm text-gray-500 text-center font-medium">
                          Creating your masterpiece...
                        </div>
                      </div>
                    </m.div>
                  )}
                  
                  <AnimatePresence mode="popLayout">
                    {virtualizedImages()}
                  </AnimatePresence>

                  {historyImages.length > visibleImages && inView && (
                    <m.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="col-span-full flex justify-center my-4"
                    >
                      <Button
                        variant="outline"
                        onClick={throttledLoadMore}
                        disabled={isLoadingMore}
                        className="bg-white/50 backdrop-blur-sm hover:bg-white/60
                          transform-gpu transition-all duration-200"
                      >
                        {isLoadingMore ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : null}
                        Load More Images
                      </Button>
                    </m.div>
                  )}
                </m.div>
              </LazyMotion>
            </div>

            <div className="border-t border-white/10 bg-white/5 p-2 sm:p-3">
              <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
                <div className="relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-emerald-500/10 
                    rounded-2xl blur opacity-75" />
                  
                  <div className="relative rounded-xl overflow-hidden 
                    bg-white/10 dark:bg-gray-900/20
                    border border-white/20 dark:border-white/10 
                    shadow-[0_8px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_16px_rgba(0,0,0,0.2)]
                    transition-shadow duration-300 hover:shadow-[0_12px_24px_rgba(0,0,0,0.12)] 
                    dark:hover:shadow-[0_12px_24px_rgba(0,0,0,0.3)]">
                    
                    {/* Model Selectors Row */}
                    <div className="flex items-center justify-between gap-2 px-3 pt-2 pb-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <ImageTypeSelector onStyleChange={setSelectedStyle} />
                        <ModelSelector onModelChange={setSelectedModel} />
                        <SizeSelector onSizeChange={setSelectedSize} />
                      </div>
                    </div>

                    {/* Input Area */}
                    <div className="relative">
                      <Textarea
                        value={prompt}
                        onChange={(e) => {
                          setPrompt(e.target.value);
                          e.target.style.height = 'auto';
                          e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                        }}
                        placeholder="Describe the image you want to generate..."
                        className="w-full min-h-[45px] max-h-[200px] px-3 py-2
                          bg-transparent border-0 focus:outline-none focus:ring-0
                          placeholder:text-gray-400/70 dark:placeholder:text-gray-500/70
                          text-gray-700 dark:text-gray-200 resize-none
                          text-[0.925rem] focus:border-0
                          [&:not(:focus)]:border-0 [&:not(:focus)]:ring-0
                          focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                      
                      {/* Subtle Separator */}
                      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between px-3 py-1.5 
                      bg-gradient-to-b from-transparent to-black/[0.02] dark:to-white/[0.02]">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleEnhancePrompt}
                          disabled={!prompt.trim() || isEnhancing}
                          className="h-8 px-3 text-xs font-medium
                            bg-white/5 hover:bg-white/10 
                            dark:bg-white/5 dark:hover:bg-white/10
                            text-gray-700 dark:text-gray-200
                            border border-white/10 rounded-lg
                            transition-colors duration-200"
                        >
                          {isEnhancing ? (
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          <span>{isEnhancing ? "Enhancing..." : "Enhance"}</span>
                        </Button>
                      </div>

                      <Button 
                        type="submit"
                        disabled={!prompt.trim() || isLoading}
                        className="h-8 px-4 text-xs font-medium
                          bg-gradient-to-r from-purple-500 via-blue-500 to-emerald-500
                          hover:from-purple-600 hover:via-blue-600 hover:to-emerald-600
                          disabled:from-gray-400 disabled:to-gray-500
                          text-white rounded-lg
                          shadow-lg hover:shadow-xl
                          transition-all duration-300
                          disabled:shadow-none disabled:opacity-70"
                      >
                        <div className="flex items-center gap-1.5">
                          {isLoading ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          <span>{isLoading ? "Generating..." : "Generate"}</span>
                        </div>
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </Card>
        </div>
      </main>
      <AnimatePresence mode="wait">
        {selectedImage && (
          <ImagePreview
            src={selectedImage}
            alt="Generated image preview"
            prompt={selectedImagePrompt}
            onClose={() => {
              setSelectedImage(null);
              setSelectedImagePrompt('');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ImaginePage() {
  return (
    <Suspense fallback={
      <div className="flex h-[100dvh] items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50/50 to-pink-50/50">
        <div className="animate-spin">
          <RefreshCw className="w-8 h-8 text-gray-400" />
        </div>
      </div>
    }>
      <ImagineContent />
    </Suspense>
  );
} 