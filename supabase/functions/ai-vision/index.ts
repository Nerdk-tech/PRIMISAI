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

    // Build vision prompt for Prexzy GPT-4
    const visionPrompt = `You are analyzing an image. ${prompt || 'Describe this image in detail'}\n\nImage data: ${imageUrl}`;

    // Use Prexzy GPT-4 API for vision
    const response = await fetch(`${prexzyApiBase}/ai/gpt4?text=${encodeURIComponent(visionPrompt)}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Prexzy GPT-4 Vision Error:', errorText);
      throw new Error(`Prexzy API Error: ${errorText}`);
    }

    const data = await response.json();
    console.log('Prexzy GPT-4 Vision Response:', JSON.stringify(data));
    
    // Extract text from response (handle array or string)
    let description = '';
    if (Array.isArray(data.text)) {
      description = data.text.join(' ');
    } else {
      description = data.text || data.response || data.result || data.content || '';
    }
    
    if (!description) {
      console.error('No text in API response:', data);
      throw new Error('No description from Prexzy API');
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
