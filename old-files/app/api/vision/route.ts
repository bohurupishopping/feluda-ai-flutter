import { GoogleAIFileManager } from "@google/generative-ai/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const fileManager = new GoogleAIFileManager(process.env.GOOGLE_API_KEY || '');
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

// Supported MIME types for document processing
const SUPPORTED_DOC_TYPES = [
  'application/pdf',
  'application/x-javascript',
  'text/javascript',
  'application/x-python',
  'text/x-python',
  'text/plain',
  'text/html',
  'text/css',
  'text/md',
  'text/csv',
  'text/xml',
  'text/rtf'
];

// Supported MIME types for vision processing
const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
];

const generatePromptByFileType = (fileType: string, userPrompt: string) => {
  const basePrompt = `Please analyze this ${fileType} document and provide a detailed response following this structure:

## Summary
[Provide a brief overview]

## Detailed Analysis
[Main content broken into relevant sections]

## Key Points
- [Important point 1]
- [Important point 2]
- [etc...]

## Technical Details
[If applicable, include technical specifications, code analysis, or data points]

## Recommendations
[If applicable, provide actionable insights or suggestions]

## Key Takeaways
[Summarize 3-5 main takeaways]

Specific request: ${userPrompt}

Please format the response using markdown with appropriate headers, bullet points, bold text, and code blocks where relevant.`;

  return basePrompt;
};

export const maxDuration = 60; // Set max duration to 300 seconds (5 minutes)
export const dynamic = 'force-dynamic'; // Disable static optimization

export async function POST(req: NextRequest) {
  let tempFilePath: string | null = null;
  
  try {
    // Add request timeout handling
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 280000); // 280 seconds
    });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const prompt = formData.get('prompt') as string;
    const systemPrompt = formData.get('systemPrompt') as string;
    const model = formData.get('model') as string;
    const fileType = formData.get('fileType') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size (limit to 20MB)
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds 20MB limit' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!SUPPORTED_DOC_TYPES.includes(file.type) && !SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type' },
        { status: 400 }
      );
    }

    // Wrap the main processing in Promise.race with timeout
    const processingPromise = (async () => {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      tempFilePath = join(tmpdir(), `upload-${Date.now()}-${file.name}`);
      await writeFile(tempFilePath, buffer);

      const uploadResult = await fileManager.uploadFile(tempFilePath, {
        mimeType: file.type,
        displayName: file.name,
      });

      // Initialize Gemini model with enhanced configuration
      const geminiModel = genAI.getGenerativeModel({ 
        model: model || "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 8192,
        }
      });

      const isDocument = SUPPORTED_DOC_TYPES.includes(file.type);
      const enhancedPrompt = generatePromptByFileType(fileType, prompt);

      const result = await geminiModel.generateContent([
        { text: systemPrompt },
        { text: enhancedPrompt },
        {
          fileData: {
            fileUri: uploadResult.file.uri,
            mimeType: uploadResult.file.mimeType,
          },
        }
      ]);

      const response = await result.response;
      let formattedText = response.text();

      // Ensure proper markdown formatting
      formattedText = formattedText
        .replace(/^#(?!#)/gm, '##') // Ensure headers start at level 2
        .replace(/(\*\*.*?\*\*)/g, '$1\n') // Add newline after bold text
        .replace(/^[-*]\s/gm, '\n- ') // Ensure proper bullet point formatting
        .replace(/\n{3,}/g, '\n\n'); // Remove excessive newlines

      // Clean up the uploaded file from Google AI
      await fileManager.deleteFile(uploadResult.file.name);

      return { result: formattedText, fileType: isDocument ? 'document' : 'image' };
    })();

    const result = await Promise.race([processingPromise, timeoutPromise]);
    return NextResponse.json(result);

  } catch (error) {
    console.error('File processing error:', error);
    
    // Improved error handling
    let errorMessage = 'Failed to process file';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message === 'Request timeout') {
        errorMessage = 'Request timed out. Please try with a smaller file or simpler request.';
        statusCode = 504;
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  } finally {
    // Clean up temporary file
    if (tempFilePath) {
      try {
        await unlink(tempFilePath).catch(console.error);
      } catch (error) {
        console.error('Error cleaning up temp file:', error);
      }
    }
  }
} 