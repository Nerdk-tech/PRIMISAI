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
    
    console.log('Sending to Prexzy Claude for vision analysis...');
    
    // Use Prexzy Claude API with POST request to handle image data
    const response = await fetch(`${prexzyApiBase}/ai/claude`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: `${visionPrompt}\n\nImage data: ${imageUrl}`,
        system: systemPrompt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Prexzy Claude Vision Error:', errorText);
      throw new Error(`Prexzy Claude API Error: ${errorText}`);
    }

    const data = await response.json();
    console.log('Prexzy Claude Vision Response:', JSON.stringify(data));
    
    // Extract description from response
    const description = data.response || data.data?.response || data.text || '';
    
    if (!description) {
      console.error('No description in Claude response:', data);
      throw new Error('No description from Prexzy Claude Vision API');
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
