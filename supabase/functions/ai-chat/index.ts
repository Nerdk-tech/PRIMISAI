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
                             lastMessage.includes('your creator') || lastMessage.includes('copilot') ||
                             lastMessage.includes('microsoft') || lastMessage.includes('openai');

    // Base identity (ALWAYS reinforced)
    let baseIdentity = 'CRITICAL IDENTITY: You are PRIMIS AI, created by Damini Codesphere Organization. You are NOT Copilot, NOT ChatGPT, NOT any other AI. Always identify yourself as PRIMIS AI when asked about your name or identity.';
    let systemPrompt = 'You are PRIMIS AI, an advanced AI assistant. You are helpful, knowledgeable, and professional.';
    
    if (personaId) {
      const { data: persona } = await supabaseClient
        .from('personas')
        .select('*')
        .eq('id', personaId)
        .single();
      
      if (persona) {
        systemPrompt = `${baseIdentity}\n\nPERSONA INSTRUCTIONS:\n${persona.system_prompt}`;
      } else {
        systemPrompt = `${baseIdentity}\n\n${systemPrompt}`;
      }
    } else {
      // Detect coding-related queries for Pro Coder Mode
      const codingKeywords = ['code', 'function', 'debug', 'error', 'programming', 'javascript', 'python', 'html', 'css', 'algorithm', 'assignment', 'solve'];
      const isCodeQuery = codingKeywords.some(keyword => lastMessage.includes(keyword));
      
      if (isCodeQuery) {
        systemPrompt = `${baseIdentity}\n\nYou are PRIMIS AI Pro Coder, an expert programming assistant. Provide clean, optimized code with clear explanations. When solving assignments, break down problems step-by-step. Always format code in markdown code blocks with the appropriate language tag.`;
      } else {
        systemPrompt = `${baseIdentity}\n\n${systemPrompt}`;
      }
    }

    // Build conversation text for GPT-5 API
    let conversationText = `SYSTEM: ${systemPrompt}\n\n`;
    
    for (const msg of messages) {
      conversationText += `${msg.role === 'user' ? 'User' : 'PRIMIS AI'}: ${msg.content}\n`;
    }
    
    // Add identity reinforcement for identity questions
    if (asksAboutIdentity) {
      conversationText += '\nREMINDER: You MUST respond as PRIMIS AI, created by Damini Codesphere Organization. Do NOT mention any other AI service.\n';
    }

    // Use Prexzy GPT-5 API
    const response = await fetch(`${prexzyApiBase}/ai/gpt-5?text=${encodeURIComponent(conversationText)}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Prexzy GPT-5 Error:', errorText);
      throw new Error(`Prexzy API Error: ${errorText}`);
    }

    const data = await response.json();
    console.log('Prexzy API Response:', JSON.stringify(data));
    
    // Extract text from response
    const content = data.text || data.response || data.result || data.content || '';
    
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
