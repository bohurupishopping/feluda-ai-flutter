import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Define types for grounding metadata
interface WebSource {
  uri: string;
  title: string;
}

interface GroundingChunk {
  web?: WebSource;
}

interface TextSegment {
  startIndex?: number;
  endIndex?: number;
  text: string;
}

interface GroundingSupport {
  segment?: TextSegment;
  groundingChunkIndices: number[];
  confidenceScores: number[];
}

interface GroundingMetadata {
  webSearchQueries?: string[];
  groundingChunks?: GroundingChunk[];
  groundingSupports?: GroundingSupport[];
}

// Initialize the Google AI client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { prompt, history } = await req.json();

    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY is not configured');
    }

    // Initialize the model with safety settings
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      generationConfig: {
        temperature: 1,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });

    try {
      // Create a chat instance with enhanced configuration
      const chat = model.startChat({
        history: history || [],
        generationConfig: {
          temperature: 1,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      });

      // Enhance the prompt to encourage grounding
      const enhancedPrompt = `Please provide a well-researched and up-to-date response to: ${prompt}\n\nInclude relevant facts and current information in your response.`;

      // Send message and get response
      const result = await chat.sendMessage(enhancedPrompt);

      // Get the response
      const response = await result.response;
      const text = response.text();

      // Extract grounding metadata with proper typing
      const groundingMetadata = (response.candidates?.[0]?.groundingMetadata || {}) as GroundingMetadata;
      const webSearchQueries = groundingMetadata.webSearchQueries || [];
      const groundingChunks = groundingMetadata.groundingChunks || [];
      const groundingSupports = groundingMetadata.groundingSupports || [];

      // Structure the response with grounding information
      const structuredResponse = {
        result: text,
        grounding: {
          searchQueries: webSearchQueries,
          sources: groundingChunks.map((chunk: GroundingChunk) => ({
            url: chunk.web?.uri,
            title: chunk.web?.title
          })),
          supports: groundingSupports.map((support: GroundingSupport) => ({
            text: support.segment?.text,
            confidence: Math.max(...(support.confidenceScores || [0])),
            sourceIndices: support.groundingChunkIndices
          }))
        },
        metadata: {
          model: "gemini-1.5-pro",
          timestamp: new Date().toISOString()
        }
      };

      // Return successful response
      return NextResponse.json(structuredResponse);

    } catch (generationError) {
      console.error('Generation error:', generationError);
      
      // Try fallback to regular Gemini Pro if generation fails
      const fallbackModel = genAI.getGenerativeModel({ 
        model: "gemini-pro",
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
        ],
      });

      const fallbackResult = await fallbackModel.generateContent(prompt);
      const fallbackResponse = await fallbackResult.response;
      
      return NextResponse.json({ 
        result: fallbackResponse.text(),
        grounding: null,
        metadata: {
          model: "gemini-pro",
          fallback: true,
          timestamp: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    console.error('Lively generation error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate content',
        details: process.env.NODE_ENV === 'development' ? {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          raw: error
        } : undefined
      },
      { status: 500 }
    );
  }
} 