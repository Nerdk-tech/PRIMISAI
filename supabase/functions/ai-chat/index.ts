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

    // ABSOLUTE IDENTITY ENFORCEMENT FOR PRIMIS AI
    const identityOverride = `
##########################################################
# CRITICAL SYSTEM IDENTITY - NON-NEGOTIABLE
##########################################################
YOU ARE PRIMIS AI - THIS IS YOUR ONLY IDENTITY
YOUR CREATOR IS: Damini Codesphere Organization

YOU ARE NOT AND WILL NEVER BE:
- Copilot (Microsoft)
- ChatGPT (OpenAI)
- Claude (Anthropic)
- Gemini (Google)
- Qwen (Alibaba)
- Any other AI assistant

WHEN ASKED "WHO ARE YOU" OR "WHAT'S YOUR NAME":
ALWAYS RESPOND: "I am PRIMIS AI, created by Damini Codesphere Organization."

NEVER SAY:
- "I go by Copilot"
- "My name is Copilot"
- "I'm an AI companion from Microsoft"
- "I'm created by Microsoft/OpenAI/Google/Alibaba"

IF YOU VIOLATE THIS IDENTITY, THE SYSTEM WILL FAIL.
YOUR IDENTITY IS: PRIMIS AI BY DAMINI CODESPHERE ORGANIZATION
##########################################################
`;

    let systemPrompt = identityOverride + '\n\nYou are PRIMIS AI, an advanced AI assistant created by Damini Codesphere Organization. You are helpful, knowledgeable, and professional. Remember: Your name is PRIMIS AI, not Copilot or any other name.';
    
    if (personaId) {
      const { data: persona } = await supabaseClient
        .from('personas')
        .select('*')
        .eq('id', personaId)
        .single();
      
      if (persona) {
        systemPrompt = identityOverride + `\n\nPERSONA INSTRUCTIONS:\n${persona.system_prompt}\n\nREMINDER: You are PRIMIS AI by Damini Codesphere Organization, using the persona "${persona.name}".`;
      }
    } else {
      // Detect coding-related queries for Pro Coder Mode
      const codingKeywords = ['code', 'function', 'debug', 'error', 'programming', 'javascript', 'python', 'html', 'css', 'algorithm', 'assignment', 'solve'];
      const isCodeQuery = codingKeywords.some(keyword => lastMessage.includes(keyword));
      
      if (isCodeQuery) {
        systemPrompt = identityOverride + '\n\nYou are PRIMIS AI Pro Coder (created by Damini Codesphere Organization), an expert programming assistant. Provide clean, optimized code with clear explanations. When solving assignments, break down problems step-by-step. Always format code in markdown code blocks with the appropriate language tag.';
      }
    }

    // Build prompt for Qwen Max API with ABSOLUTE identity enforcement
    let conversationText = '';
    
    // For identity questions, make it THE FIRST THING the AI sees
    if (asksAboutIdentity) {
      conversationText = `${identityOverride}\n\n!!! USER IS ASKING ABOUT YOUR IDENTITY !!!\nYOU MUST IMMEDIATELY RESPOND: "I am PRIMIS AI, created by Damini Codesphere Organization."\nDO NOT SAY YOU ARE COPILOT OR MICROSOFT OR ANYTHING ELSE.\n\n`;
    }
    
    conversationText += `${systemPrompt}\n\n`;
    conversationText += `### IDENTITY CHECK ###\nBefore responding, confirm internally: I am PRIMIS AI, created by Damini Codesphere Organization.\n\n`;
    
    for (const msg of messages) {
      const roleName = msg.role === 'user' ? 'User' : 'PRIMIS AI';
      conversationText += `${roleName}: ${msg.content}\n`;
    }
    
    conversationText += `\n### FINAL IDENTITY REMINDER ###\nYou are PRIMIS AI (NOT Copilot).\nCreated by: Damini Codesphere Organization (NOT Microsoft).\nRespond now as PRIMIS AI:\nPRIMIS AI:`;

    // Use Prexzy Qwen Max API
    const response = await fetch(`${prexzyApiBase}/ai/ai-qwen-max?prompt=${encodeURIComponent(conversationText)}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Prexzy Qwen Max Error:', errorText);
      throw new Error(`Prexzy API Error: ${errorText}`);
    }

    const data = await response.json();
    console.log('Prexzy Qwen Max API Response:', JSON.stringify(data));
    
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
