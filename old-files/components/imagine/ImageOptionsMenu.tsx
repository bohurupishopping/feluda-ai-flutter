"use client";

import { MoreVertical } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ImageOptionsMenuProps {
  onModelChange: (model: string) => void;
  onSizeChange: (size: string) => void;
  onStyleChange: (style: string) => void;
}

export default function ImageOptionsMenu({ onModelChange, onSizeChange, onStyleChange }: ImageOptionsMenuProps) {
  const models = [
    {
      id: 'black-forest-labs/FLUX.1-schnell-Free',
      name: 'FLUX.1 Schnell',
    },
    {
      id: 'stabilityai/stable-diffusion-xl-base-1.0',
      name: 'Stable Diffusion XL',
    }
  ];

  const sizes = [
    {
      id: '1024x1024',
      name: 'Square',
      description: '1024x1024',
    },
    {
      id: '1024x1792',
      name: 'Portrait',
      description: '1024x1792',
    },
    {
      id: '1792x1024',
      name: 'Landscape',
      description: '1792x1024',
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-xl bg-white/10 backdrop-blur-md 
            border-white/20 hover:bg-white/20"
        >
          <MoreVertical className="h-4 w-4 text-gray-700" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[200px] rounded-xl bg-white/90 backdrop-blur-xl
          border-white/20 shadow-lg p-2"
      >
        <DropdownMenuLabel className="text-xs font-medium text-gray-500 px-2">
          Model
        </DropdownMenuLabel>
        {models.map((model) => (
          <DropdownMenuItem
            key={model.id}
            onClick={() => onModelChange(model.id)}
            className="flex items-center justify-between px-2 py-1.5
              text-xs cursor-pointer hover:bg-gray-100/50
              transition-colors duration-200 rounded-lg"
          >
            <span className="font-medium">{model.name}</span>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator className="my-2 bg-gray-200" />
        
        <DropdownMenuLabel className="text-xs font-medium text-gray-500 px-2">
          Size
        </DropdownMenuLabel>
        {sizes.map((size) => (
          <DropdownMenuItem
            key={size.id}
            onClick={() => onSizeChange(size.id)}
            className="flex items-center justify-between px-2 py-1.5
              text-xs cursor-pointer hover:bg-gray-100/50
              transition-colors duration-200 rounded-lg"
          >
            <div className="flex flex-col">
              <span className="font-medium">{size.name}</span>
              <span className="text-[9px] text-gray-500">{size.description}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 