import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const elevenlabsKey = Deno.env.get('ELEVENLABS_API_KEY');

// Map voice names to ElevenLabs voice IDs
const VOICE_MAP: Record<string, string> = {
  'alloy': 'pNInz6obpgDQGcFmaJgB',   // Adam (male)
  'echo': 'ErXwobaYiN019PkySvjV',    // Antoni (male)
  'fable': 'VR6AewLTigWG4xSOukaG',   // Arnold (male)
  'nova': 'EXAVITQu4vr4xnSDxMaL',    // Bella (female)
  'shimmer': 'MF3mGyEYCl7XYWbV9V6O', // Elli (female)
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { text, voice = 'alloy' } = await req.json();

    if (!text || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get ElevenLabs voice ID
    const voiceId = VOICE_MAP[voice] || VOICE_MAP['alloy'];

    // Call ElevenLabs TTS API
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': elevenlabsKey!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs TTS Error:', errorText);
      throw new Error(`ElevenLabs TTS: ${errorText}`);
    }

    // Get audio blob
    const audioBlob = await response.blob();
    const audioBuffer = await audioBlob.arrayBuffer();

    // Return audio as base64
    const base64Audio = btoa(
      String.fromCharCode(...new Uint8Array(audioBuffer))
    );

    return new Response(
      JSON.stringify({ 
        audio: `data:audio/mpeg;base64,${base64Audio}`,
        voice: voice
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('TTS error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
