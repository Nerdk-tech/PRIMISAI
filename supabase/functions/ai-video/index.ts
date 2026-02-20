import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

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

    const { action, prompt, predictionId, model = 'openai/sora-2', seconds = 4, aspectRatio = 'landscape' } = await req.json();

    if (action === 'create') {
      const provider = model.split('/')[0];
      const modelName = model.split('/')[1];

      const response = await fetch(`${baseUrl}/models/${provider}/${modelName}/predictions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          input: {
            prompt,
            seconds,
            aspect_ratio: aspectRatio,
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OnSpace AI Video Create Error:', errorText);
        throw new Error(`OnSpace AI: ${errorText}`);
      }

      const data = await response.json();
      
      return new Response(
        JSON.stringify({ id: data.id, status: data.status }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'check') {
      const response = await fetch(`${baseUrl}/predictions/${predictionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OnSpace AI Video Check Error:', errorText);
        throw new Error(`OnSpace AI: ${errorText}`);
      }

      const status = await response.json();

      if (status.status === 'failed' || status.status === 'canceled') {
        throw new Error(status.error || 'Video generation failed');
      }

      if (status.status === 'succeeded' && status.output) {
        const videoResponse = await fetch(status.output);
        const arrayBuffer = await videoResponse.arrayBuffer();
        const videoBlob = new Blob([arrayBuffer], { type: 'video/mp4' });

        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const fileName = `${user.id}/${predictionId}.mp4`;
        const { error: uploadError } = await supabaseAdmin.storage
          .from('generated-videos')
          .upload(fileName, videoBlob, {
            contentType: 'video/mp4',
            upsert: true
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('generated-videos')
          .getPublicUrl(fileName);

        return new Response(
          JSON.stringify({ 
            id: predictionId,
            status: 'succeeded',
            videoUrl: publicUrl,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          id: predictionId,
          status: status.status,
          progress: status.progress || 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error: any) {
    console.error('Video generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
