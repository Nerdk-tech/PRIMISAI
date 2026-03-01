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

    // Build vision analysis prompt for Claude Haiku 4.5
    const visionPrompt = prompt || 'Analyze this image in detail. Describe what you see, including objects, people, colors, mood, and any text present.';
    
    // System prompt for vision analysis
    const systemPrompt = 'You are an expert image analyst. Provide detailed, accurate descriptions of images. Focus on objects, people, colors, mood, text, and overall composition.';

    // Use Prexzy Claude API for vision (Claude Haiku 4.5 has multimodal vision support)
    console.log('Sending to Claude Haiku 4.5 for vision analysis...');
    
    // Claude endpoint expects text and system parameters, and the image is sent as base64
    const claudeUrl = `${prexzyApiBase}/ai/claude?text=${encodeURIComponent(visionPrompt + '\n\nImage: ' + imageUrl)}&system=${encodeURIComponent(systemPrompt)}`;
    
    const response = await fetch(claudeUrl, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Prexzy Claude Vision Error:', errorText);
      throw new Error(`Claude Vision API Error: ${errorText}`);
    }

    const data = await response.json();
    console.log('Prexzy Claude Vision Response:', JSON.stringify(data));
    
    // Extract response from Claude API
    const description = data.response || data.text || data.result || data.content || '';
    
    if (!description) {
      console.error('No response in Claude API response:', data);
      throw new Error('No description from Claude Vision API');
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
