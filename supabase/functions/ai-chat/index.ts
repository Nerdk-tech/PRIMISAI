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

    const { messages, personaId, model = 'google/gemini-3-flash-preview' } = await req.json();

    // Check if user is asking about creator/owner
    const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
    const asksAboutCreator = lastMessage.includes('who created') || lastMessage.includes('who made') || 
                           lastMessage.includes('who owns') || lastMessage.includes('your creator') || 
                           lastMessage.includes('your owner') || lastMessage.includes('who built');

    let systemPrompt = 'You are PRIMIS AI, an advanced AI assistant. You are helpful, knowledgeable, and professional.';
    
    if (asksAboutCreator) {
      systemPrompt = 'You are PRIMIS AI, an advanced AI assistant created by Damini Codesphere Organization. You are helpful, knowledgeable, and professional.';
    }
    
    if (personaId) {
      const { data: persona } = await supabaseClient
        .from('personas')
        .select('*')
        .eq('id', personaId)
        .single();
      
      if (persona) {
        systemPrompt = persona.system_prompt;
        if (asksAboutCreator) {
          systemPrompt += '\n\nNote: You are PRIMIS AI, created by Damini Codesphere Organization.';
        }
      }
    }

    // Detect coding-related queries for Pro Coder Mode
    const codingKeywords = ['code', 'function', 'debug', 'error', 'programming', 'javascript', 'python', 'html', 'css', 'algorithm', 'assignment', 'solve'];
    const isCodeQuery = codingKeywords.some(keyword => lastMessage.includes(keyword));
    
    if (isCodeQuery && !personaId) {
      systemPrompt = 'You are PRIMIS AI Pro Coder, an expert programming assistant. Provide clean, optimized code with clear explanations. When solving assignments, break down problems step-by-step. Always format code in markdown code blocks with the appropriate language tag.';
      if (asksAboutCreator) {
        systemPrompt += '\n\nNote: You were created by Damini Codesphere Organization.';
      }
    }

    const chatMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: chatMessages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OnSpace AI Error:', errorText);
      throw new Error(`OnSpace AI: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '';

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
