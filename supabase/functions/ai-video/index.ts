import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const magicHourApiKey = Deno.env.get('MAGIC_HOUR_API_KEY');

if (!magicHourApiKey) {
  throw new Error('MAGIC_HOUR_API_KEY is not configured');
}

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

    const { action, prompt, predictionId, seconds = 5 } = await req.json();

    if (action === 'create') {
      console.log('Creating video with Magic Hour API...');
      
      // Determine valid duration based on available options for ltx-2 model
      const validDurations = [3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30];
      const duration = validDurations.find(d => d >= seconds) || 5;
      
      const response = await fetch('https://api.magichour.ai/v1/text-to-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${magicHourApiKey}`,
        },
        body: JSON.stringify({
          style: {
            prompt: prompt,
            negative_prompt: 'blurry, low quality, distorted, deformed, bad anatomy'
          },
          end_seconds: duration,
          aspect_ratio: '16:9',
          resolution: '720p',
          model: 'ltx-2', // Fast iteration with audio support
          audio: true,
          name: `PRIMIS AI Video - ${new Date().toISOString()}`,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Magic Hour Video Create Error:', errorText);
        throw new Error(`Magic Hour API Error: ${errorText}`);
      }

      const data = await response.json();
      console.log('Magic Hour video job created:', data);
      
      return new Response(
        JSON.stringify({ id: data.id, status: 'processing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'check') {
      const response = await fetch(`https://api.magichour.ai/v1/video-projects/${predictionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${magicHourApiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Magic Hour Video Check Error:', errorText);
        throw new Error(`Magic Hour API Error: ${errorText}`);
      }

      const status = await response.json();
      console.log('Magic Hour video status:', status);

      if (status.status === 'failed' || status.status === 'error') {
        throw new Error(status.error?.message || 'Video generation failed');
      }

      if (status.status === 'complete' && status.downloads?.[0]?.url) {
        const videoUrl = status.downloads[0].url;
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

      // Map Magic Hour status to expected format
      const normalizedStatus = status.status === 'queued' || status.status === 'rendering' ? 'processing' : status.status;
      
      return new Response(
        JSON.stringify({ 
          id: predictionId,
          status: normalizedStatus,
          progress: status.progress_percent || (status.status === 'rendering' ? 50 : 0),
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
