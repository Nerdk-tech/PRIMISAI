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

    const { messages, personaId, model = 'google/gemini-3-flash-preview' } = await req.json();

    // Check if user is asking about identity/creator
    const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
    const asksAboutIdentity = lastMessage.includes('who are you') || lastMessage.includes('what are you') || 
                             lastMessage.includes('your name') || lastMessage.includes('who created') || 
                             lastMessage.includes('who made') || lastMessage.includes('who owns') || 
                             lastMessage.includes('your creator') || lastMessage.includes('your owner');

    let systemPrompt = 'You are PRIMIS AI, an advanced AI assistant created by Damini Codesphere Organization. You are helpful, knowledgeable, and professional.';
    
    if (personaId) {
      const { data: persona } = await supabaseClient
        .from('personas')
        .select('*')
        .eq('id', personaId)
        .single();
      
      if (persona) {
        systemPrompt = `You are PRIMIS AI created by Damini Codesphere Organization, using the persona "${persona.name}".\n\n${persona.system_prompt}`;
      }
    } else {
      // Detect coding-related queries for Pro Coder Mode
      const codingKeywords = ['code', 'function', 'debug', 'error', 'programming', 'javascript', 'python', 'html', 'css', 'algorithm', 'assignment', 'solve'];
      const isCodeQuery = codingKeywords.some(keyword => lastMessage.includes(keyword));
      
      if (isCodeQuery) {
        systemPrompt = 'You are PRIMIS AI Pro Coder, created by Damini Codesphere Organization. You are an expert programming assistant. Provide clean, optimized code with clear explanations. When solving assignments, break down problems step-by-step. Always format code in markdown code blocks with the appropriate language tag.';
      }
    }

    // Build prompt with identity enforcement only when asked
    let conversationText = `${systemPrompt}\n\n`;
    
    if (asksAboutIdentity) {
      conversationText += `IMPORTANT: The user is asking about your identity. You must respond clearly that you are PRIMIS AI, created by Damini Codesphere Organization. Do not claim to be any other AI assistant.\n\n`;
    }
    
    for (const msg of messages) {
      const roleName = msg.role === 'user' ? 'User' : 'Assistant';
      conversationText += `${roleName}: ${msg.content}\n`;
    }
    
    conversationText += `\nAssistant:`;

    // Use Prexzy ai4chat API
    const response = await fetch(`${prexzyApiBase}/ai/ai4chat?prompt=${encodeURIComponent(conversationText)}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Prexzy ai4chat Error:', errorText);
      throw new Error(`Prexzy API Error: ${errorText}`);
    }

    const data = await response.json();
    console.log('Prexzy ai4chat API Response:', JSON.stringify(data));
    
    // Extract text from response (handle nested structure and arrays)
    let content = '';
    
    // Check nested data.data.response structure
    if (data.data && data.data.response) {
      content = data.data.response;
    } else if (Array.isArray(data.text)) {
      content = data.text.join(' ');
    } else {
      content = data.text || data.response || data.result || data.content || '';
    }
    
    if (!content) {
      console.error('No text in API response:', data);
      throw new Error('No response text from Prexzy API');
    }

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Chat completion error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
