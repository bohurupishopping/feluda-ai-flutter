import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ZoomIn, ZoomOut, Copy, Check, Maximize2, Minimize2, Share2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface ImagePreviewProps {
  src: string;
  alt: string;
  prompt: string;
  onClose: () => void;
}

export default function ImagePreview({ src, alt, prompt, onClose }: ImagePreviewProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const imageRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Handle image load to get natural dimensions
  const handleImageLoad = (e: any) => {
    const img = e.target as HTMLImageElement;
    setImageSize({
      width: img.naturalWidth,
      height: img.naturalHeight
    });
  };

  // Update container size on mount and resize
  useEffect(() => {
    const updateContainerSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({
          width: rect.width,
          height: rect.height
        });
      }
    };

    updateContainerSize();
    window.addEventListener('resize', updateContainerSize);
    return () => window.removeEventListener('resize', updateContainerSize);
  }, [isFullscreen]);

  // Reset position and scale when zooming is disabled
  useEffect(() => {
    if (!isZoomed) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isZoomed]);

  // Enhanced zoom functionality
  const handleZoom = (e: WheelEvent | TouchEvent, deltaY?: number) => {
    if (!isZoomed) return;
    e.preventDefault();

    // Get cursor position relative to image
    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return;

    let clientX, clientY;
    if (e instanceof WheelEvent) {
      clientX = e.clientX;
      clientY = e.clientY;
      deltaY = e.deltaY;
    } else if (e instanceof TouchEvent && e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      clientX = (touch1.clientX + touch2.clientX) / 2;
      clientY = (touch1.clientY + touch2.clientY) / 2;
      const distance = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );
      deltaY = -distance * 0.1;
    } else {
      return;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Calculate new scale
    const delta = deltaY! * -0.01;
    const newScale = Math.min(Math.max(1, scale + delta), 4);
    
    // Calculate new position to zoom towards cursor
    const scaleChange = newScale - scale;
    const newPosition = {
      x: position.x - (x * scaleChange),
      y: position.y - (y * scaleChange)
    };

    setScale(newScale);
    setPosition(newPosition);
  };

  useEffect(() => {
    const imageElement = imageRef.current;
    if (!imageElement) return;

    const handleWheelEvent = (e: WheelEvent) => handleZoom(e);
    const handleTouchStartEvent = (e: TouchEvent) => setIsDragging(true);
    const handleTouchMoveEvent = (e: TouchEvent) => handleZoom(e);
    const handleTouchEndEvent = () => setIsDragging(false);

    imageElement.addEventListener('wheel', handleWheelEvent, { passive: false });
    imageElement.addEventListener('touchstart', handleTouchStartEvent, { passive: false });
    imageElement.addEventListener('touchmove', handleTouchMoveEvent, { passive: false });
    imageElement.addEventListener('touchend', handleTouchEndEvent, { passive: false });

    return () => {
      imageElement.removeEventListener('wheel', handleWheelEvent);
      imageElement.removeEventListener('touchstart', handleTouchStartEvent);
      imageElement.removeEventListener('touchmove', handleTouchMoveEvent);
      imageElement.removeEventListener('touchend', handleTouchEndEvent);
    };
  }, [isZoomed, isDragging, scale, position]);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setIsZoomed(false);
  };

  // Download functionality
  const handleDownload = async () => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename = `${prompt.slice(0, 30).trim().replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.png`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Image downloaded successfully",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Failed to download image",
        variant: "destructive",
      });
    }
  };

  // Copy prompt functionality
  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setIsCopied(true);
      toast({
        title: "Copied",
        description: "Prompt copied to clipboard",
      });
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy prompt",
        variant: "destructive",
      });
    }
  };

  // Share functionality
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Generated Image',
          text: prompt,
          url: src
        });
      } else {
        await navigator.clipboard.writeText(src);
        toast({
          title: "Copied",
          description: "Image URL copied to clipboard",
        });
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        "bg-gradient-to-br from-black/90 via-black/95 to-black/90",
        "backdrop-blur-md"
      )}
      onClick={onClose}
    >
      <div 
        ref={containerRef}
        className={cn(
          "relative mx-auto transition-all duration-300 ease-out transform-gpu",
          isFullscreen ? "w-screen h-screen" : "w-[90vw] h-[90vh] max-w-7xl"
        )}
        onClick={e => e.stopPropagation()}
      >
        {/* Image Container */}
        <div 
          ref={imageRef}
          className={cn(
            "relative w-full h-full rounded-2xl overflow-hidden",
            "bg-gradient-to-br from-gray-900/50 to-black/50",
            "backdrop-blur-xl shadow-2xl",
            isFullscreen ? "" : "border border-white/10"
          )}
        >
          <motion.div 
            className="relative w-full h-full"
            animate={{
              scale: scale,
              x: position.x,
              y: position.y,
            }}
            drag={isZoomed}
            dragConstraints={imageRef}
            dragElastic={0.1}
            dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
            whileTap={{ cursor: "grabbing" }}
          >
            <Image
              src={src}
              alt={alt}
              fill
              className={cn(
                "select-none transition-all duration-300 ease-out",
                isZoomed ? "cursor-move" : "cursor-zoom-in",
                "object-contain"
              )}
              draggable={false}
              priority
              quality={95}
              onLoad={handleImageLoad}
            />
          </motion.div>

          {/* Controls */}
          <div className="absolute top-0 right-0 left-0 p-4 flex items-center justify-between
            bg-gradient-to-b from-black/50 to-transparent">
            {/* Left side - Image Info */}
            <div className="flex items-center gap-4">
              <div className="text-white/80 text-sm font-medium">
                {imageSize.width} × {imageSize.height}
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full bg-white/10 backdrop-blur-md 
                  hover:bg-white/20 border-white/20
                  text-white shadow-lg"
                onClick={() => setIsZoomed(!isZoomed)}
              >
                {isZoomed ? (
                  <ZoomOut className="h-4 w-4" />
                ) : (
                  <ZoomIn className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full bg-white/10 backdrop-blur-md 
                  hover:bg-white/20 border-white/20
                  text-white shadow-lg"
                onClick={handleCopyPrompt}
              >
                {isCopied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full bg-white/10 backdrop-blur-md 
                  hover:bg-white/20 border-white/20
                  text-white shadow-lg"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full bg-white/10 backdrop-blur-md 
                  hover:bg-white/20 border-white/20
                  text-white shadow-lg"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full bg-white/10 backdrop-blur-md 
                  hover:bg-white/20 border-white/20
                  text-white shadow-lg"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full bg-white/10 backdrop-blur-md 
                  hover:bg-white/20 border-white/20
                  text-white shadow-lg"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Prompt Display */}
          <div className="absolute bottom-0 left-0 right-0 p-4
            bg-gradient-to-t from-black/50 to-transparent">
            <p className="text-white/90 text-sm line-clamp-2 max-w-3xl mx-auto text-center">
              {prompt}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
} 