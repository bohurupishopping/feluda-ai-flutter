"use client";

import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const imageStyles = {
  'photo-realism': {
    name: 'Photo Realism',
    prompt: '(photorealistic:1.4), (hyperrealistic:1.3), masterpiece, professional photography, 8k resolution, highly detailed, sharp focus, HDR, high contrast, cinematic lighting, volumetric lighting, ambient occlusion, ray tracing, professional color grading, dramatic atmosphere, shot on Hasselblad H6D-400C, 100mm f/2.8 lens, golden hour photography, detailed textures, intricate details, pristine quality, award-winning photography'
  },
  'comic': {
    name: 'Comic Style',
    prompt: 'comic book style, rendered in 16K for maximum detail, vibrant colors, bold lines, dynamic composition, comic book illustration, detailed linework, cel shading, comic panel layout, superhero comic style, manga influence, strong contrast, action-packed, comic book shading, professional comic art, detailed comic illustration, comic book coloring, comic book lighting, comic book perspective, fantasy art style, by Greg Rutkowski, impressive lighting, transcending reality and illusion, high detail'
  },
  'oil-painting': {
    name: 'Oil Painting',
    prompt: 'oil painting masterpiece, rendered in 16K for maximum detail, traditional art, detailed brushstrokes, rich colors, impasto technique, canvas texture, classical painting style, fine art, museum quality, oil on canvas, painterly effect, artistic composition, professional oil painting, detailed color blending, traditional painting techniques, gallery quality artwork, fine art painting, fantasy art style, by Greg Rutkowski, impressive lighting, transcending reality and illusion, high detail'
  },
  'illustration': {
    name: 'Digital Illustration',
    prompt: 'digital art masterpiece, rendered in 16K for maximum detail, professional illustration, detailed artwork, vibrant colors, clean lines, modern illustration style, digital painting, professional design, detailed rendering, stylized art, commercial illustration quality, professional digital artwork, high-end illustration, detailed digital painting, professional illustration techniques, fantasy art style, by Greg Rutkowski, impressive lighting, transcending reality and illusion, high detail'
  },
  'watercolor': {
    name: 'Watercolor',
    prompt: 'watercolor painting masterpiece, rendered in 16K for maximum detail, soft colors, flowing textures, watercolor effects, traditional watercolor technique, artistic watercolor style, delicate brushstrokes, watercolor paper texture, professional watercolor artwork, detailed water media, watercolor washing techniques, controlled bleeding effects, artistic water media, fantasy art style, by Greg Rutkowski, impressive lighting, transcending reality and illusion, high detail'
  },
  'pixel-art': {
    name: 'Pixel Art',
    prompt: 'pixel art masterpiece, rendered in 16K for maximum detail, retro gaming aesthetic, clear pixels, limited color palette, pixelated details, 16-bit style, classic pixel art, retro game art style, detailed pixel work, professional pixel art, clean pixel lines, retro gaming inspiration, pixel perfect artwork, fantasy art style, by Greg Rutkowski, impressive lighting, transcending reality and illusion, high detail'
  }
};

interface ImageTypeSelectorProps {
  onStyleChange: (style: string) => void;
}

export default function ImageTypeSelector({ onStyleChange }: ImageTypeSelectorProps) {
  const [selectedStyle, setSelectedStyle] = useState('photo-realism');

  const handleStyleSelect = (styleId: string) => {
    setSelectedStyle(styleId);
    onStyleChange(imageStyles[styleId as keyof typeof imageStyles].prompt);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5 h-8 px-2.5 
            bg-white/10 backdrop-blur-md border border-white/20
            hover:bg-white/20 transition-all duration-300
            rounded-xl text-xs font-medium text-gray-700"
        >
          <span className="text-xs">{imageStyles[selectedStyle as keyof typeof imageStyles].name}</span>
          <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[160px] rounded-xl bg-white/90 backdrop-blur-xl
          border-white/20 shadow-lg p-1"
      >
        {Object.entries(imageStyles).map(([id, style]) => (
          <DropdownMenuItem
            key={id}
            onClick={() => handleStyleSelect(id)}
            className="flex items-center justify-between px-2 py-1.5
              text-xs cursor-pointer hover:bg-gray-100/50
              transition-colors duration-200 rounded-lg"
          >
            <span className="font-medium">{style.name}</span>
            {selectedStyle === id && (
              <Check className="h-3.5 w-3.5 text-blue-500" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 