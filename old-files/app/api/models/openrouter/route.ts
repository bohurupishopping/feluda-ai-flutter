import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenRouter client
const openRouterClient = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPEN_ROUTER_API_KEY || '',
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL,
    "X-Title": "FeludaAI",
  }
});

export async function GET() {
  try {
    // Fetch all models from OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPEN_ROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || '',
        'X-Title': 'FeludaAI',
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch OpenRouter models');
    }

    const data = await response.json();

    // Filter for models with ":free" suffix
    const freeModels = data.data
      .filter((model: any) => 
        model.id.endsWith(':free') && 
        !model.id.includes('deprecated')
      )
      .map((model: any) => ({
        id: model.id,
        name: model.name || model.id.split('/').pop().replace(':free', ''),
        maxTokens: model.context_length || 8192,
        provider: 'OpenRouter',
        contextWindow: model.context_length,
        pricing: model.pricing
      }));

    // If API fails or no models found, return default models
    if (freeModels.length === 0) {
      return NextResponse.json({
        models: [
          {
            id: 'nousresearch/hermes-3-llama-3.1-405b:free',
            name: 'Hermes 3 405B',
            maxTokens: 8192,
            provider: 'OpenRouter'
          },
          {
            id: 'meta-llama/llama-3.1-70b-instruct:free',
            name: 'Llama 3.1 70B',
            maxTokens: 8192,
            provider: 'OpenRouter'
          }
        ]
      });
    }

    return NextResponse.json({ models: freeModels });
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error);
    // Return default models on error
    return NextResponse.json({
      models: [
        {
          id: 'nousresearch/hermes-3-llama-3.1-405b:free',
          name: 'Hermes 3 405B',
          maxTokens: 8192,
          provider: 'OpenRouter'
        },
        {
          id: 'meta-llama/llama-3.1-70b-instruct:free',
          name: 'Llama 3.1 70B',
          maxTokens: 8192,
          provider: 'OpenRouter'
        }
      ]
    });
  }
} 