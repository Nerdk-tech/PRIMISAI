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

    const { prompt, negative_prompt = '' } = await req.json();

    console.log('Generating image with Prexzy Realistic API:', prompt);

    // Use Prexzy realistic image generation API
    const apiUrl = `${prexzyApiBase}/ai/realistic?prompt=${encodeURIComponent(prompt)}&negative_prompt=${encodeURIComponent(negative_prompt)}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Prexzy Realistic API Error:', errorText);
      throw new Error(`Prexzy Realistic API Error: ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    console.log('Response content-type:', contentType);
    let imageBlob: Blob;

    if (contentType?.includes('application/json')) {
      const data = await response.json();
      console.log('Prexzy Realistic JSON response:', JSON.stringify(data));
      
      // Handle various JSON response formats
      if (data.image_url || data.url || data.imageUrl) {
        const imageUrl = data.image_url || data.url || data.imageUrl;
        console.log('Fetching image from URL:', imageUrl);
        const imageResponse = await fetch(imageUrl);
        imageBlob = await imageResponse.blob();
      } else if (data.image || data.data || data.result) {
        // Base64 encoded image
        const base64Data = (data.image || data.data || data.result);
        const base64String = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
        console.log('Converting base64 to blob (length:', base64String.length, ')');
        const imageBytes = Uint8Array.from(atob(base64String), c => c.charCodeAt(0));
        imageBlob = new Blob([imageBytes], { type: 'image/png' });
      } else {
        console.error('No image data found in response:', data);
        throw new Error('No image data in Prexzy response');
      }
    } else {
      // Response is the image directly
      console.log('Response is direct image blob');
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
