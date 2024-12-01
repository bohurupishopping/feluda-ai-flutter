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

interface ModelSelectorProps {
  onModelChange: (model: string) => void;
}

export default function ModelSelector({ onModelChange }: ModelSelectorProps) {
  const [selectedModel, setSelectedModel] = useState('black-forest-labs/FLUX.1-schnell-Free');

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

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    onModelChange(modelId);
  };

  const selectedModelData = models.find(model => model.id === selectedModel);

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
          <span className="text-xs">{selectedModelData?.name}</span>
          <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[160px] rounded-xl bg-white/90 backdrop-blur-xl
          border-white/20 shadow-lg p-1"
      >
        {models.map((model) => (
          <DropdownMenuItem
            key={model.id}
            onClick={() => handleModelSelect(model.id)}
            className="flex items-center justify-between px-2 py-1.5
              text-xs cursor-pointer hover:bg-gray-100/50
              transition-colors duration-200 rounded-lg"
          >
            <span className="font-medium">{model.name}</span>
            {selectedModel === model.id && (
              <Check className="h-3.5 w-3.5 text-blue-500" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 