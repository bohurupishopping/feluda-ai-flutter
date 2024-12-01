import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { imageUrl } = await request.json();

    // Fetch image with proper headers
    const response = await fetch(imageUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch image from Together API');
    }

    // Get the image as a buffer
    const imageBuffer = await response.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Error in save-image route:', error);
    return NextResponse.json(
      { error: 'Failed to process image' },
      { status: 500 }
    );
  }
} 