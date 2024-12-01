import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET() {
  try {
    // Initialize the Google AI client
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
    
    // Return default models since we're using the same configuration for both
    return NextResponse.json({
      models: [
        {
          id: 'gemini-1.5-pro',
          name: 'Gemini 1.5 Pro',
          description: 'Most capable Gemini model for highly complex tasks',
          inputTokenLimit: 1000000,
          outputTokenLimit: 1000000,
          provider: 'Google',
          temperature: 0.7,
          topP: 0.4
        },
        {
          id: 'gemini-1.5-flash',
          name: 'Gemini 1.5 Flash',
          description: 'Optimized for faster response times',
          inputTokenLimit: 128000,
          outputTokenLimit: 128000,
          provider: 'Google',
          temperature: 0.7,
          topP: 0.4
        }
      ]
    });
  } catch (error) {
    console.error('Error with Gemini models:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get models' },
      { status: 500 }
    );
  }
} 