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

interface SizeSelectorProps {
  onSizeChange: (size: string) => void;
}

export default function SizeSelector({ onSizeChange }: SizeSelectorProps) {
  const [selectedSize, setSelectedSize] = useState('1024x1024');

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

  const handleSizeSelect = (sizeId: string) => {
    setSelectedSize(sizeId);
    onSizeChange(sizeId);
  };

  const selectedSizeData = sizes.find(size => size.id === selectedSize);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-1.5 h-8 px-2.5 
            bg-white/10 backdrop-blur-md border border-white/20
            hover:bg-white/20 transition-all duration-300
            rounded-xl text-xs font-medium text-gray-700"
        >
          <span className="text-xs">{selectedSizeData?.name}</span>
          <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[160px] rounded-xl bg-white/90 backdrop-blur-xl
          border-white/20 shadow-lg p-1"
      >
        {sizes.map((size) => (
          <DropdownMenuItem
            key={size.id}
            onClick={() => handleSizeSelect(size.id)}
            className="flex items-center justify-between px-2 py-1.5
              text-xs cursor-pointer hover:bg-gray-100/50
              transition-colors duration-200 rounded-lg"
          >
            <div className="flex flex-col">
              <span className="font-medium">{size.name}</span>
              <span className="text-[9px] text-gray-500">{size.description}</span>
            </div>
            {selectedSize === size.id && (
              <Check className="h-3.5 w-3.5 text-blue-500" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 