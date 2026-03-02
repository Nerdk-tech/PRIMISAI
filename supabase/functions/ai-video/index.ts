import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const shortApiKey = Deno.env.get('SHORTAPI_AI_KEY');

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

    const { action, prompt, predictionId, model = 'kwaivgi/kling-2.6/text-to-video', seconds = 5 } = await req.json();

    if (action === 'create') {
      console.log('Creating video with ShortAPI Kling 2.6 model...');
      
      const response = await fetch('https://api.shortapi.ai/v1/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${shortApiKey}`,
        },
        body: JSON.stringify({
          model: model,
          input: {
            prompt: prompt,
            duration: seconds,
            aspect_ratio: '16:9',
            negative_prompt: 'blurry, low quality, distorted, deformed',
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ShortAPI Video Create Error:', errorText);
        throw new Error(`ShortAPI API Error: ${errorText}`);
      }

      const data = await response.json();
      console.log('ShortAPI video job created:', data);
      
      return new Response(
        JSON.stringify({ id: data.id, status: 'processing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'check') {
      const response = await fetch(`https://api.shortapi.ai/v1/status/${predictionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${shortApiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ShortAPI Video Check Error:', errorText);
        throw new Error(`ShortAPI API Error: ${errorText}`);
      }

      const status = await response.json();
      console.log('ShortAPI video status:', status);

      if (status.status === 'failed') {
        throw new Error(status.error || 'Video generation failed');
      }

      if (status.status === 'succeeded' && status.output?.video) {
        const videoUrl = status.output.video;
        const videoResponse = await fetch(videoUrl);
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
          status: status.status === 'queued' || status.status === 'processing' ? 'processing' : status.status,
          progress: status.progress || (status.status === 'processing' ? 50 : 0),
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
