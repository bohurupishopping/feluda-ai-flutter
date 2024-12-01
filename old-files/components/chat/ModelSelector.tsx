"use client";

import React, { useEffect, useState } from 'react';
import { Sparkles, Bot, Cpu, Brain, Zap, Star, Lightbulb, Atom, Wand2, Rocket, Cloud, FlaskConical } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/components/ui/select";
import { motion } from "framer-motion";

interface ModelSelectorProps {
  onModelChange: (model: string) => void;
  compact?: boolean;
  isChatMode?: boolean;
}

interface GeminiModel {
  id: string;
  name: string;
  description: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  provider: string;
  temperature: number;
  topP: number;
}

interface GroqModel {
  id: string;
  name: string;
  maxTokens: number;
  provider: string;
}

interface OpenRouterModel {
  id: string;
  name: string;
  maxTokens: number;
  provider: string;
  contextWindow?: number;
  pricing?: {
    prompt: number;
    completion: number;
  };
}

interface ModelConfig {
  provider: string;
  value: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

interface ProviderConfig {
  name: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  models: ModelConfig[];
}

const STATIC_MODEL_CONFIGS: ModelConfig[] = [
  { 
    provider: 'Groq',
    value: 'groq',
    label: 'Llama 3.2 90B',
    icon: Zap,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
  },
  { 
    provider: 'Mistral',
    value: 'open-mistral-nemo',
    label: 'Nemo',
    icon: Cpu,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
  },
  { 
    provider: 'Pixtral',
    value: 'pixtral-large-latest',
    label: 'Large',
    icon: Brain,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  { 
    provider: 'X.AI',
    value: 'xai',
    label: 'Grok',
    icon: Rocket,
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
  },
  { 
    provider: 'OpenRouter',
    value: 'nousresearch/hermes-3-llama-3.1-405b:free',
    label: 'Hermes 3 405B',
    icon: Brain,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
  },
  { 
    provider: 'OpenRouter',
    value: 'meta-llama/llama-3.1-70b-instruct:free',
    label: 'Llama 3.1 70B',
    icon: Sparkles,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
  },
  { 
    provider: 'GitHub',
    value: 'github-gpt4-mini',
    label: 'GPT-4 Mini',
    icon: Bot,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
  }
];

export function ModelSelector({ onModelChange, compact, isChatMode }: ModelSelectorProps) {
  const [geminiModels, setGeminiModels] = useState<GeminiModel[]>([]);
  const [groqModels, setGroqModels] = useState<GroqModel[]>([]);
  const [openRouterModels, setOpenRouterModels] = useState<OpenRouterModel[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('');

  // Load saved preferences
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedProvider = localStorage.getItem('selectedProvider');
      const savedModel = localStorage.getItem('selectedModel');
      if (savedProvider) setSelectedProvider(savedProvider);
      if (savedModel) {
        setSelectedModel(savedModel);
        onModelChange(savedModel);
      }
    }
  }, []);

  // Save provider selection
  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    localStorage.setItem('selectedProvider', provider);
    
    // When provider changes, select first model of that provider if no saved model exists for it
    const providerConfig = providerConfigs.find(p => p.name === provider);
    if (providerConfig?.models.length) {
      const savedModel = localStorage.getItem('selectedModel');
      const providerModels = providerConfig.models.map(m => m.value);
      
      // If saved model doesn't belong to new provider, select first model
      if (!savedModel || !providerModels.includes(savedModel)) {
        const newModel = providerConfig.models[0].value;
        setSelectedModel(newModel);
        localStorage.setItem('selectedModel', newModel);
        onModelChange(newModel);
      }
    }
  };

  // Save model selection
  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    localStorage.setItem('selectedModel', model);
    onModelChange(model);
  };

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const [geminiResponse, groqResponse, openRouterResponse] = await Promise.all([
          fetch('/api/models/gemini'),
          fetch('/api/models/groq'),
          fetch('/api/models/openrouter')
        ]);

        if (!geminiResponse.ok) throw new Error('Failed to fetch Gemini models');
        if (!groqResponse.ok) throw new Error('Failed to fetch Groq models');
        if (!openRouterResponse.ok) throw new Error('Failed to fetch OpenRouter models');
        
        const geminiData = await geminiResponse.json();
        const groqData = await groqResponse.json();
        const openRouterData = await openRouterResponse.json();

        setGeminiModels(geminiData.models);
        setGroqModels(groqData.models);
        setOpenRouterModels(openRouterData.models);
      } catch (err) {
        console.error('Error fetching models:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch models');
      } finally {
        setIsLoading(false);
      }
    };

    fetchModels();
  }, []);

  // Group models by provider
  const providerConfigs: ProviderConfig[] = React.useMemo(() => [
    {
      name: 'Groq',
      icon: Brain,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
      models: groqModels.map(model => ({
        provider: 'Groq',
        value: model.id,
        label: model.name.split('Llama ')[1],
        icon: Brain,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-50',
      }))
    },
    {
      name: 'Google',
      icon: Lightbulb,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      models: geminiModels.map(model => ({
        provider: 'Google',
        value: model.id,
        label: model.name.split('Gemini ')[1],
        icon: model.id.includes('pro') ? Lightbulb : Wand2,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
      }))
    },
    {
      name: 'Mistral',
      icon: Cpu,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      models: STATIC_MODEL_CONFIGS.filter(m => m.provider === 'Mistral')
    },
    {
      name: 'Pixtral',
      icon: Brain,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      models: STATIC_MODEL_CONFIGS.filter(m => m.provider === 'Pixtral')
    },
    {
      name: 'X.AI',
      icon: Rocket,
      color: 'text-gray-700',
      bgColor: 'bg-gray-50',
      models: STATIC_MODEL_CONFIGS.filter(m => m.provider === 'X.AI')
    },
    {
      name: 'OpenRouter',
      icon: Brain,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
      models: openRouterModels.map(model => ({
        provider: 'OpenRouter',
        value: model.id,
        label: model.name.split('/').pop() || model.name,
        icon: Brain,
        color: 'text-orange-500',
        bgColor: 'bg-orange-50',
      }))
    },
    {
      name: 'GitHub',
      icon: Bot,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
      models: STATIC_MODEL_CONFIGS.filter(m => m.provider === 'GitHub')
    }
  ], [groqModels, geminiModels, openRouterModels]);

  // Modified default provider and model setup
  React.useEffect(() => {
    if (!isLoading && providerConfigs.length > 0 && !selectedProvider) {
      const savedProvider = localStorage.getItem('selectedProvider');
      const savedModel = localStorage.getItem('selectedModel');

      if (savedProvider && savedModel) {
        const providerConfig = providerConfigs.find(p => p.name === savedProvider);
        if (providerConfig && providerConfig.models.some(m => m.value === savedModel)) {
          setSelectedProvider(savedProvider);
          setSelectedModel(savedModel);
          onModelChange(savedModel);
          return;
        }
      }

      // If no valid saved preferences, set defaults
      const firstProvider = providerConfigs[0];
      setSelectedProvider(firstProvider.name);
      localStorage.setItem('selectedProvider', firstProvider.name);
      
      if (firstProvider.models.length > 0) {
        const firstModel = firstProvider.models[0].value;
        setSelectedModel(firstModel);
        localStorage.setItem('selectedModel', firstModel);
        onModelChange(firstModel);
      }
    }
  }, [isLoading, providerConfigs, onModelChange]);

  const IconComponent = ({ icon: Icon, color, bgColor }: { 
    icon: React.ElementType,
    color: string,
    bgColor: string
  }) => (
    <div className={`p-1 rounded-lg ${bgColor}`}>
      <Icon className={`h-3 w-3 ${color}`} />
    </div>
  );

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className={`${compact ? 'w-[160px]' : 'w-[180px]'} h-9 bg-gray-200 rounded-xl`} />
      </div>
    );
  }

  if (error) {
    console.error('Model loading error:', error);
    return (
      <Select onValueChange={onModelChange}>
        <SelectTrigger className={`${compact ? 'w-[160px]' : 'w-[180px]'} h-9`}>
          <SelectValue placeholder="Select Model" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {STATIC_MODEL_CONFIGS.map((model) => (
              <SelectItem key={model.value} value={model.value}>
                {model.provider} {model.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="flex gap-2">
      {/* Provider Selection */}
      <Select value={selectedProvider} onValueChange={handleProviderChange}>
        <SelectTrigger 
          className={`${compact ? 'w-[120px]' : 'w-[140px]'} 
            bg-white/10 backdrop-blur-sm border border-white/20
            rounded-xl shadow-sm hover:shadow-md transition-all duration-200
            ${isChatMode ? 'h-9' : 'h-9'} px-3
            focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30
            text-gray-600 hover:bg-white/20
            group relative overflow-hidden`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 
            opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <SelectValue placeholder="Select Provider" />
        </SelectTrigger>
        <SelectContent 
          className="rounded-xl bg-white/95 backdrop-blur-xl border border-white/20 shadow-lg 
            max-h-[280px] overflow-y-auto p-1 min-w-[120px] focus:outline-none
            animate-in fade-in-0 zoom-in-95"
        >
          <SelectGroup className="px-0.5">
            {providerConfigs.map((provider) => (
              <SelectItem 
                key={provider.name} 
                value={provider.name}
                className="group focus:bg-gray-50/70 rounded-lg py-0 outline-none 
                  data-[highlighted]:bg-gradient-to-r data-[highlighted]:from-purple-500/20 data-[highlighted]:to-blue-500/20
                  data-[highlighted]:outline-none
                  focus:outline-none focus:ring-0 focus-visible:outline-none
                  focus-visible:ring-0 relative overflow-hidden"
              >
                <motion.div 
                  className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg
                    hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-blue-500/10 
                    transition-colors duration-150
                    focus:outline-none"
                  whileHover={{ scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <IconComponent 
                    icon={provider.icon} 
                    color={provider.color} 
                    bgColor={`${provider.bgColor} bg-opacity-60`} 
                  />
                  <span className="text-[13px] font-medium text-gray-700 truncate">
                    {provider.name}
                  </span>
                </motion.div>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {/* Model Selection */}
      <Select 
        value={selectedModel}
        onValueChange={handleModelChange}
        disabled={!selectedProvider}
      >
        <SelectTrigger 
          className={`${compact ? 'w-[140px]' : 'w-[160px]'} 
            bg-white/10 backdrop-blur-sm border border-white/20
            rounded-xl shadow-sm hover:shadow-md transition-all duration-200
            ${isChatMode ? 'h-9' : 'h-9'} px-3
            focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30
            text-gray-600 hover:bg-white/20
            group relative overflow-hidden
            disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 
            opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <SelectValue placeholder="Select Model" />
        </SelectTrigger>
        <SelectContent 
          className="rounded-xl bg-white/95 backdrop-blur-xl border border-white/20 shadow-lg 
            max-h-[280px] overflow-y-auto p-1 min-w-[140px] focus:outline-none
            animate-in fade-in-0 zoom-in-95"
        >
          <SelectGroup className="px-0.5">
            {selectedProvider && providerConfigs
              .find(p => p.name === selectedProvider)?.models.map((model) => (
                <SelectItem 
                  key={model.value} 
                  value={model.value}
                  className="group focus:bg-gray-50/70 rounded-lg py-0 outline-none 
                    data-[highlighted]:bg-gradient-to-r data-[highlighted]:from-purple-500/20 data-[highlighted]:to-blue-500/20
                    data-[highlighted]:outline-none
                    focus:outline-none focus:ring-0 focus-visible:outline-none
                    focus-visible:ring-0 relative overflow-hidden"
                >
                  <motion.div 
                    className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg
                      hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-blue-500/10 
                      transition-colors duration-150
                      focus:outline-none"
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <IconComponent 
                      icon={model.icon} 
                      color={model.color} 
                      bgColor={`${model.bgColor} bg-opacity-60`} 
                    />
                    <span className="text-[13px] font-medium text-gray-700 truncate">
                      {model.label}
                    </span>
                  </motion.div>
                </SelectItem>
              ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
