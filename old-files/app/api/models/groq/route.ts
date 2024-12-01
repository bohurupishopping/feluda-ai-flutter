import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize Groq client
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || '',
  baseURL: 'https://api.groq.com/openai/v1'
});

export async function GET() {
  try {
    // Fetch all models from Groq
    const response = await groq.models.list();

    // Our preferred models in order
    const preferredModels = [
      'llama-3.2-90b-vision-preview',
      'llama-3.2-11b-vision-preview'
    ];

    // Filter and format models
    const groqModels = response.data
      .filter(model => preferredModels.includes(model.id))
      .sort((a, b) => {
        // Sort based on our preferred order
        return preferredModels.indexOf(a.id) - preferredModels.indexOf(b.id);
      })
      .map(model => ({
        id: model.id,
        name: model.id
          .replace('llama-', 'Llama ')
          .replace('-vision-preview', ' Vision')
          .replace('-versatile', ' Versatile'),
        maxTokens: 8192, // Limited to 8,192 max tokens in preview
        provider: 'Groq'
      }));

    // If API fails or no models found, return default models
    if (groqModels.length === 0) {
      return NextResponse.json({
        models: [
          {
            id: 'llama-3.2-90b-vision-preview',
            name: 'Llama 3.2 90B Vision',
            maxTokens: 8192,
            provider: 'Groq'
          }
        ]
      });
    }

    return NextResponse.json({ models: groqModels });
  } catch (error) {
    console.error('Error fetching Groq models:', error);
    // Return default models on error
    return NextResponse.json({
      models: [
        {
          id: 'llama-3.2-90b-vision-preview',
          name: 'Llama 3.2 90B Vision',
          maxTokens: 8192,
          provider: 'Groq'
        }
      ]
    });
  }
} 