import { corsHeaders } from '../_shared/cors.ts';

const prexzyApiBase = 'https://apis.prexzyvilla.site';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { imageUrl, prompt } = await req.json();

    if (!imageUrl) {
      throw new Error('No image provided');
    }

    const visionPrompt = prompt || 'Analyze this image in detail. Describe what you see, including objects, people, colors, mood, and any text present.';
    const systemPrompt = 'You are a helpful AI assistant with vision analysis capabilities. Analyze images carefully and provide detailed, accurate descriptions.';
    
    console.log('Sending to Prexzy ai4chat for vision analysis...');
    
    // Use Prexzy ai4chat with image data
    const fullPrompt = `${systemPrompt}\n\n${visionPrompt}\n\nImage: ${imageUrl}`;
    const response = await fetch(`${prexzyApiBase}/ai/ai4chat?prompt=${encodeURIComponent(fullPrompt)}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Prexzy Vision Error:', errorText);
      throw new Error(`Prexzy API Error: ${errorText}`);
    }

    const data = await response.json();
    console.log('Prexzy Vision Response:', JSON.stringify(data));
    
    // Extract description from response (check nested structure first)
    const description = data.data?.response || data.response || data.text || '';
    
    if (!description) {
      console.error('No description in response:', data);
      throw new Error('No description from Prexzy Vision API');
    }

    return new Response(
      JSON.stringify({ description }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Vision analysis error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to analyze image' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
