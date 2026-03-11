import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const falApiKey = Deno.env.get('FAL_API_KEY') || 'mhk_live_ETMycazrHoHj2FQJns69Wu1FG5WlhPnCUl1oWyVQmIZZmqnXgkNFGrvfU9X0lEvwpV3wsEUqGYauoxLK';

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

    const { action, prompt, predictionId, model = 'fal-ai/ltx-video', seconds = 5 } = await req.json();

    if (action === 'create') {
      console.log('Creating video with fal.ai LTX-Video model...');
      
      const response = await fetch('https://fal.run/fal-ai/ltx-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${falApiKey}`,
        },
        body: JSON.stringify({
          prompt: prompt,
          num_frames: Math.min(seconds * 24, 120), // 24fps, max 120 frames (~5s)
          aspect_ratio: '16:9',
          negative_prompt: 'blurry, low quality, distorted, deformed',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('fal.ai Video Create Error:', errorText);
        throw new Error(`fal.ai API Error: ${errorText}`);
      }

      const data = await response.json();
      console.log('fal.ai video job created:', data);
      
      return new Response(
        JSON.stringify({ id: data.request_id || data.id, status: 'processing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'check') {
      const response = await fetch(`https://fal.run/fal-ai/ltx-video/requests/${predictionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Key ${falApiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('fal.ai Video Check Error:', errorText);
        throw new Error(`fal.ai API Error: ${errorText}`);
      }

      const status = await response.json();
      console.log('fal.ai video status:', status);

      if (status.status === 'failed' || status.status === 'error') {
        throw new Error(status.error?.message || status.error || 'Video generation failed');
      }

      if (status.status === 'completed' && status.video?.url) {
        const videoUrl = status.video.url;
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
          status: status.status === 'in_queue' || status.status === 'in_progress' ? 'processing' : status.status,
          progress: status.progress || (status.status === 'in_progress' ? 50 : 0),
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
