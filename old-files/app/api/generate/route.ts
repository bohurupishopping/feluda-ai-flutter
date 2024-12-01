import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createOpenAI } from '@ai-sdk/openai/dist';
import { createMistral } from '@ai-sdk/mistral/dist';
import { createGroq } from '@ai-sdk/groq/dist';
import { generateText } from 'ai';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize clients with server-side env variables
const openRouterClient = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPEN_ROUTER_API_KEY || '',
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL,
    "X-Title": "FeludaAI",
  }
});

const xai = createOpenAI({
  name: 'xai',
  baseURL: 'https://api.x.ai/v1',
  apiKey: process.env.XAI_API_KEY ?? '',
});

const togetherClient = new OpenAI({
  apiKey: process.env.TOGETHER_API_KEY || '',
  baseURL: 'https://api.together.xyz/v1',
});

const mistralClient = createMistral({
  apiKey: process.env.MISTRAL_API_KEY || ''
});

const groqClient = createGroq({
  apiKey: process.env.GROQ_API_KEY || ''
});

// Initialize Google AI client
const googleAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

const githubAIClient = new OpenAI({
  baseURL: "https://models.inference.ai.azure.com",
  apiKey: process.env.GITHUB_AI_TOKEN || '',
});

export async function POST(req: Request) {
  try {
    const { model, prompt, options } = await req.json();

    let result;

    // Handle Hermes model streaming first
    if (model === 'nousresearch/hermes-3-llama-3.1-405b:free') {
      const stream = await openRouterClient.chat.completions.create({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options?.maxTokens || 8192,
        temperature: options?.temperature || 0.7,
        top_p: options?.topP || 0.4,
        stream: true
      });

      const textEncoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          let accumulatedText = '';
          
          try {
            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content || '';
              accumulatedText += content;
              
              // Send the chunk with paragraph information
              const data = {
                text: content,
                accumulated: accumulatedText,
                done: false
              };
              
              controller.enqueue(textEncoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            }
            
            // Send final accumulated text
            controller.enqueue(
              textEncoder.encode(
                `data: ${JSON.stringify({ text: '', accumulated: accumulatedText, done: true })}\n\n`
              )
            );
          } catch (error) {
            console.error('Streaming error:', error);
            controller.error(error);
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }
    // Handle Google AI models with streaming for Gemini models
    else if (model.startsWith('gemini-')) {
      const modelName = model;
      const googleModel = googleAI.getGenerativeModel({ model: modelName });
      
      try {
        // Use streaming for both Pro and Flash models
        const response = await googleModel.generateContentStream({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: model === 'gemini-1.5-pro' ? 1000000 : 
                            model === 'gemini-1.5-flash' ? 8192 : 
                            8192,
            temperature: options?.temperature || 1,
            topP: options?.topP || 0.95
          }
        });

        let fullText = '';
        
        for await (const chunk of response.stream) {
          const chunkText = chunk.text();
          fullText += chunkText;
        }
        
        result = fullText;
      } catch (error: any) {
        console.error('Gemini API error:', error);
        throw new Error(`Gemini API error: ${error.message || 'Unknown error'}`);
      }
    }
    // Handle Together AI models
    else if (model.startsWith('together/')) {
      const modelName = model.replace('together/', '');
      const response = await togetherClient.chat.completions.create({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options?.maxTokens || 8192,
        temperature: options?.temperature || 0.7,
        top_p: options?.topP || 0.4
      });

      result = response.choices[0]?.message?.content;
    } 
    // Handle OpenRouter models
    else if (model.includes('/') && !model.startsWith('llama-')) {
      const response = await openRouterClient.chat.completions.create({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options?.maxTokens || 8192,
        temperature: options?.temperature || 0.7,
        top_p: options?.topP || 0.95,
        stream: false
      });

      result = response.choices[0]?.message?.content;
    }
    // Handle Groq models
    else if (model.startsWith('llama-') || model === 'groq') {
      const modelId = model === 'groq' ? 'llama-3.2-90b-vision-preview' : model;
      const modelInstance = groqClient(modelId);

      const response = await generateText({
        model: modelInstance,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: options?.maxTokens || 8192,
        temperature: options?.temperature || 0.7,
        topP: options?.topP || 0.95,
      });

      result = response.text;
    }
    // Handle other models
    else if (model === 'github-gpt4-mini') {
      const response = await githubAIClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: options?.temperature || 1.0,
        top_p: options?.topP || 1.0,
        max_tokens: options?.maxTokens || 1000,
      });

      result = response.choices[0]?.message?.content;
    }
    else {
      let modelInstance;
      switch (model) {
        case 'open-mistral-nemo':
          modelInstance = mistralClient('open-mistral-nemo');
          break;
        case 'pixtral-large-latest':
          modelInstance = mistralClient('pixtral-large-latest');
          break;
        case 'xai':
          modelInstance = xai('grok-beta');
          break;
        default:
          throw new Error('Invalid model selected');
      }

      // Use generateText for AI SDK models
      const response = await generateText({
        model: modelInstance,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: options?.maxTokens || 8192,
        temperature: options?.temperature || 0.7,
        topP: options?.topP || 0.4,
      });

      result = response.text;
    }

    if (!result) {
      throw new Error('No content generated');
    }

    // Check if response was cut off and retry if necessary
    if (result.endsWith('...') || result.endsWith('…')) {
      console.warn('Response appears to be truncated, consider increasing token limit');
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error('AI generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate content' },
      { status: 500 }
    );
  }
} 