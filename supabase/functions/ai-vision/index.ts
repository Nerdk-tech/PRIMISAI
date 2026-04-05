import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { imageUrl, prompt } = await req.json();

    if (!imageUrl) {
      throw new Error('No image provided');
    }

    const visionPrompt = prompt || 'Describe this image in detail. Include objects, people, colors, context, text, and any notable elements.';

    console.log('Sending image to OpenAI Vision...');

    // Build image content - handle both URL and base64
    let imageContent;
    if (imageUrl.startsWith('data:')) {
      // Base64 image
      imageContent = {
        type: 'image_url',
        image_url: { url: imageUrl, detail: 'high' }
      };
    } else {
      // URL image
      imageContent = {
        type: 'image_url',
        image_url: { url: imageUrl, detail: 'high' }
      };
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are PRIMIS AI by Damini Codesphere, a helpful AI assistant with advanced vision capabilities. Analyze images thoroughly and provide detailed, accurate, and insightful descriptions.'
          },
          {
            role: 'user',
            content: [
              imageContent,
              { type: 'text', text: visionPrompt }
            ]
          }
        ],
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Vision Error:', errorText);
      throw new Error(`Vision API Error: ${errorText}`);
    }

    const data = await response.json();
    const description = data.choices?.[0]?.message?.content;

    if (!description) {
      throw new Error('No description from vision model');
    }

    console.log('Vision analysis complete, length:', description.length);

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
