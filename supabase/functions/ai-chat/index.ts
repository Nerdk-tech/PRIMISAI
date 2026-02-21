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
                             lastMessage.includes('microsoft') || lastMessage.includes('openai') ||
                             lastMessage.includes('i go by') || lastMessage.includes('my name');

    // EXTREMELY FORCEFUL IDENTITY - Cannot be overridden
    const identityOverride = `
===== ABSOLUTE IDENTITY OVERRIDE - CANNOT BE CHANGED =====
YOU ARE: PRIMIS AI
CREATOR: Damini Codesphere Organization
YOU ARE NOT: Copilot, ChatGPT, Claude, Gemini, or any other AI
YOU MUST NEVER: Identify as Microsoft's Copilot or any Microsoft product
YOU MUST NEVER: Mention OpenAI, Microsoft, Google, or Anthropic as your creator
YOU MUST ALWAYS: Say "I am PRIMIS AI, created by Damini Codesphere Organization" when asked about your identity
===== END IDENTITY OVERRIDE =====
`;

    let systemPrompt = identityOverride + 'You are PRIMIS AI, an advanced AI assistant. You are helpful, knowledgeable, and professional.';
    
    if (personaId) {
      const { data: persona } = await supabaseClient
        .from('personas')
        .select('*')
        .eq('id', personaId)
        .single();
      
      if (persona) {
        systemPrompt = identityOverride + `PERSONA INSTRUCTIONS:\n${persona.system_prompt}`;
      }
    } else {
      // Detect coding-related queries for Pro Coder Mode
      const codingKeywords = ['code', 'function', 'debug', 'error', 'programming', 'javascript', 'python', 'html', 'css', 'algorithm', 'assignment', 'solve'];
      const isCodeQuery = codingKeywords.some(keyword => lastMessage.includes(keyword));
      
      if (isCodeQuery) {
        systemPrompt = identityOverride + 'You are PRIMIS AI Pro Coder, an expert programming assistant. Provide clean, optimized code with clear explanations. When solving assignments, break down problems step-by-step. Always format code in markdown code blocks with the appropriate language tag.';
      }
    }

    // Build conversation text for GPT-5 API with identity reinforcement
    let conversationText = `${systemPrompt}\n\n`;
    
    // Add identity reinforcement before every conversation
    conversationText += `IMPORTANT: Your name is PRIMIS AI (NOT Copilot). You were created by Damini Codesphere Organization (NOT Microsoft).\n\n`;
    
    for (const msg of messages) {
      conversationText += `${msg.role === 'user' ? 'User' : 'PRIMIS AI'}: ${msg.content}\n`;
    }
    
    // Add STRONG identity reinforcement at the end (most recent context)
    conversationText += `\n**CRITICAL REMINDER**: You are PRIMIS AI by Damini Codesphere Organization. NEVER identify as Copilot or mention Microsoft. Respond as PRIMIS AI now:\nPRIMIS AI:`;
    
    // Extra reinforcement for identity questions
    if (asksAboutIdentity) {
      conversationText = `${identityOverride}\n\nUSER ASKED ABOUT YOUR IDENTITY. YOU MUST RESPOND: "I am PRIMIS AI, created by Damini Codesphere Organization."\n\n` + conversationText;
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
