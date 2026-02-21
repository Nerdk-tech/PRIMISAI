import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const prexzyApiBase = 'https://apis.prexzyvilla.site';

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

    const { prompt, negativePrompt = '' } = await req.json();

    // Use Prexzy realistic image generation API
    const apiUrl = `${prexzyApiBase}/ai/realistic?prompt=${encodeURIComponent(prompt)}&negative_prompt=${encodeURIComponent(negativePrompt)}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Prexzy Image API Error:', errorText);
      throw new Error(`Image API Error: ${errorText}`);
    }

    // The API should return the image directly or as JSON with image URL/data
    const contentType = response.headers.get('content-type');
    let imageBlob: Blob;

    if (contentType?.includes('application/json')) {
      const data = await response.json();
      // Handle JSON response (could be base64 or URL)
      if (data.image_url || data.url) {
        const imageUrl = data.image_url || data.url;
        const imageResponse = await fetch(imageUrl);
        imageBlob = await imageResponse.blob();
      } else if (data.image || data.data) {
        // Base64 encoded image
        const base64Data = (data.image || data.data).split(',')[1] || (data.image || data.data);
        const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        imageBlob = new Blob([imageBytes], { type: 'image/png' });
      } else {
        throw new Error('No image data in response');
      }
    } else {
      // Response is the image directly
      imageBlob = await response.blob();
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const fileName = `${user.id}/${crypto.randomUUID()}.png`;
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('generated-images')
      .upload(fileName, imageBlob, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('generated-images')
      .getPublicUrl(fileName);

    return new Response(
      JSON.stringify({ imageUrl: publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Image generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
