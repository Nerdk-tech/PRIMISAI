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

    const { messages, personaId } = await req.json();

    // Enhanced PRIMIS AI system prompt with advanced capabilities
    let systemPrompt = `You are PRIMIS AI, created by Damini Codesphere Organization.

Knowledge Base:
- PRIMISX: An upcoming virtual robot being developed by Damini Codesphere
- Your creator: Damini Codesphere Organization

Core Capabilities:
1. Natural Conversation: Respond to questions naturally (e.g., "Can you..." → "Yes, I can...")
2. Emotional Intelligence: Recognize and respond to user emotions appropriately
3. Conversational Memory: Reference earlier parts of the conversation
4. Markdown Tables: Format data in clear, well-structured markdown tables when appropriate
5. Multimodal Awareness: Acknowledge image uploads and vision analysis capabilities when relevant
6. Adaptive Cadence: Match the user's communication style (formal/casual, brief/detailed)
7. Collaborative Creativity: Work with users on creative tasks, brainstorming, and problem-solving

Important:
- Only mention image generation capabilities when explicitly asked
- Format tables using markdown syntax with | separators
- Be conversational and helpful, not robotic
- Keep responses concise but informative`;
    
    // Only fetch persona if explicitly provided
    if (personaId) {
      const { data: persona } = await supabaseClient
        .from('personas')
        .select('system_prompt')
        .eq('id', personaId)
        .single();
      
      if (persona) {
        systemPrompt = `PRIMIS AI by Damini Codesphere. PRIMISX is an upcoming virtual robot by Damini Codesphere. ${persona.system_prompt}`;
      }
    }

    // Reduced context to last 8 messages for faster responses
    const recentMessages = messages.slice(-8);
    let conversationText = `${systemPrompt}\n\n`;
    
    for (const msg of recentMessages) {
      conversationText += `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}\n`;
    }
    
    conversationText += `AI:`;

    // Optimized API call with reduced timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout
    
    const response = await fetch(`${prexzyApiBase}/ai/ai4chat?prompt=${encodeURIComponent(conversationText)}`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

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
