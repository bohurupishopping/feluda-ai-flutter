import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { imageStyles } from '@/components/imagine/ImageTypeSelector';

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

const getStyleSpecificSystemPrompt = (styleType: string, size: string) => {
  // Get composition guidance based on size
  let compositionGuide = '';
  switch(size) {
    case '1024x1792':
      compositionGuide = 'vertical composition, portrait orientation';
      break;
    case '1792x1024':
      compositionGuide = 'horizontal composition, landscape orientation';
      break;
    default: // 1024x1024
      compositionGuide = 'balanced square composition';
  }

  // Base system prompt
  const basePrompt = `You are an expert at writing prompts for AI image generation.
Your task is to enhance the given prompt while maintaining the specific style and composition requirements.
Follow these guidelines:
- Keep the core subject/idea from the original prompt
- Make the prompt detailed but concise (max 200 words)
- Consider the ${compositionGuide}
- IMPORTANT: Respond ONLY with the enhanced prompt text
- Do NOT include any explanatory text, prefixes, or suffixes
- Do NOT include phrases like "Enhanced prompt:" or "This prompt provides..."
Do not include negative prompts or technical parameters - only enhance the descriptive content.`;

  // Add style-specific guidance
  switch(styleType) {
    case 'photo-realism':
      return `${basePrompt}
Focus on photorealistic details:
- Add specific lighting and atmosphere details
- Include technical photography terms
- Emphasize realistic textures and materials
- Consider natural lighting conditions`;
    
    case 'comic':
      return `${basePrompt}
Focus on comic book style:
- Emphasize dynamic poses and expressions
- Consider panel-like composition
- Include comic-specific lighting effects
- Think about bold colors and strong contrasts`;
    
    case 'oil-painting':
      return `${basePrompt}
Focus on oil painting characteristics:
- Consider brush stroke descriptions
- Think about classical painting composition
- Include color palette suggestions
- Emphasize texture and layering`;
    
    case 'illustration':
      return `${basePrompt}
Focus on illustration style:
- Consider modern digital art techniques
- Think about stylized elements
- Include design principles
- Emphasize artistic interpretation`;
    
    case 'watercolor':
      return `${basePrompt}
Focus on watercolor qualities:
- Consider transparency and flow
- Think about color bleeding effects
- Include paper texture suggestions
- Emphasize soft transitions`;
    
    case 'pixel-art':
      return `${basePrompt}
Focus on pixel art elements:
- Consider limited color palettes
- Think about pixel-specific details
- Include retro gaming aesthetics
- Emphasize clean pixel lines`;
    
    default:
      return basePrompt;
  }
};

export async function POST(request: Request) {
  try {
    const { prompt, styleType = 'photo-realism', size = '1024x1024' } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const systemPrompt = getStyleSpecificSystemPrompt(styleType, size);

    const completion = await client.chat.completions.create({
      model: 'llama-3.2-11b-vision-preview',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
    });

    // Clean up the response
    let enhancedPrompt = completion.choices[0].message.content?.trim() || '';
    
    // Remove common prefixes
    enhancedPrompt = enhancedPrompt
      .replace(/^(Enhanced prompt:|Enhance the prompt:|This prompt:|Here's the enhanced prompt:)/i, '')
      .replace(/^["']|["']$/g, '')
      .trim();
    
    // Remove common suffixes
    enhancedPrompt = enhancedPrompt
      .replace(/\b(This enhanced prompt provides|This description provides).*$/i, '')
      .trim();

    // Append style-specific keywords from ImageTypeSelector
    if (styleType in imageStyles) {
      const stylePrompt = imageStyles[styleType as keyof typeof imageStyles].prompt;
      enhancedPrompt = `${enhancedPrompt}, ${stylePrompt}`;
    }

    return NextResponse.json({
      success: true,
      enhancedPrompt: enhancedPrompt
    });
  } catch (error: any) {
    console.error('Error enhancing prompt:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to enhance prompt' },
      { status: 500 }
    );
  }
} 