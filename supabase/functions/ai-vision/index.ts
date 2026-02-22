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

    // Build vision analysis prompt for Gemini 2.5 Flash
    const visionPrompt = `Analyze this image in detail. ${prompt || 'Describe what you see, including objects, people, colors, mood, and any text present.'}\n\nImage: ${imageUrl}`;

    // Use Prexzy Gemini API for vision (Gemini 2.5 Flash has multimodal vision support)
    console.log('Sending to Gemini 2.5 Flash for vision analysis...');
    const response = await fetch(`${prexzyApiBase}/ai/gemini?prompt=${encodeURIComponent(visionPrompt)}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Prexzy Gemini Vision Error:', errorText);
      throw new Error(`Gemini Vision API Error: ${errorText}`);
    }

    const data = await response.json();
    console.log('Prexzy Gemini Vision Response:', JSON.stringify(data));
    
    // Extract text from response (handle array or string)
    let description = '';
    if (Array.isArray(data.text)) {
      description = data.text.join(' ');
    } else {
      description = data.text || data.response || data.result || data.content || '';
    }
    
    if (!description) {
      console.error('No text in Gemini API response:', data);
      throw new Error('No description from Gemini Vision API');
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
