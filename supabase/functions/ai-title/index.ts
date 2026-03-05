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

    const { firstUserMessage, firstAssistantMessage } = await req.json();

    // Create a prompt to generate a concise, descriptive title (3-6 words)
    const titlePrompt = `Based on this conversation, generate a concise 3-6 word title that describes the main topic or question. Only return the title, nothing else.

User: ${firstUserMessage}
Assistant: ${firstAssistantMessage}

Title:`;

    const response = await fetch(`${prexzyApiBase}/ai/ai4chat?prompt=${encodeURIComponent(titlePrompt)}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to generate title');
    }

    const data = await response.json();
    let title = '';
    
    // Extract title from response
    if (data.data && data.data.response) {
      title = data.data.response;
    } else if (Array.isArray(data.text)) {
      title = data.text.join(' ');
    } else {
      title = data.text || data.response || data.result || data.content || '';
    }
    
    // Clean up the title: remove quotes, extra whitespace, and limit length
    title = title
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .slice(0, 80); // Max 80 chars
    
    // Fallback to first message if generation fails
    if (!title || title.length < 3) {
      title = firstUserMessage.slice(0, 50) + (firstUserMessage.length > 50 ? '...' : '');
    }

    return new Response(
      JSON.stringify({ title }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Title generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate title' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
