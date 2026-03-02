import { corsHeaders } from '../_shared/cors.ts';

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { imageUrl, prompt } = await req.json();

    if (!imageUrl) {
      throw new Error('No image provided');
    }

    // Extract base64 data from data URL
    const base64Data = imageUrl.split(',')[1];
    if (!base64Data) {
      throw new Error('Invalid image format - expected data URL');
    }

    const visionPrompt = prompt || 'Analyze this image in detail. Describe what you see, including objects, people, colors, mood, and any text present.';
    
    console.log('Sending to Google Gemini Flash for vision analysis...');
    
    // Use Google Gemini Flash API with proper multimodal format
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: visionPrompt },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Data
                }
              }
            ]
          }]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini Vision Error:', errorText);
      throw new Error(`Gemini API Error: ${errorText}`);
    }

    const data = await response.json();
    console.log('Gemini Vision Response:', JSON.stringify(data));
    
    // Extract description from Gemini response
    const description = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (!description) {
      console.error('No description in Gemini response:', data);
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
