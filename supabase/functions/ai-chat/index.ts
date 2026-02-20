import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');
const geminiKey = Deno.env.get('GEMINI_API_KEY');

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

    let content = '';

    // Try OnSpace AI first
    try {
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
        
        // Check if it's a balance issue
        if (errorText.includes('Insufficient balance') || errorText.includes('balance')) {
          throw new Error('BALANCE_ERROR');
        }
        
        throw new Error(`OnSpace AI: ${errorText}`);
      }

      const data = await response.json();
      content = data.choices?.[0]?.message?.content ?? '';

    } catch (primaryError: any) {
      console.log('OnSpace AI failed, attempting Gemini fallback...');
      
      // Fallback to Gemini if available
      if (geminiKey && (primaryError.message === 'BALANCE_ERROR' || primaryError.message.includes('OnSpace AI'))) {
        try {
          // Convert messages to Gemini format
          const geminiMessages = chatMessages
            .filter(m => m.role !== 'system')
            .map(m => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }]
            }));

          // Prepend system prompt to first user message
          if (geminiMessages.length > 0 && geminiMessages[0].role === 'user') {
            const systemMsg = chatMessages.find(m => m.role === 'system');
            if (systemMsg) {
              geminiMessages[0].parts[0].text = `${systemMsg.content}\n\n${geminiMessages[0].parts[0].text}`;
            }
          }

          const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: geminiMessages,
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 2048,
                },
              }),
            }
          );

          if (!geminiResponse.ok) {
            const geminiError = await geminiResponse.text();
            console.error('Gemini fallback error:', geminiError);
            throw new Error(`Gemini: ${geminiError}`);
          }

          const geminiData = await geminiResponse.json();
          content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
          console.log('Successfully used Gemini fallback');

        } catch (fallbackError: any) {
          console.error('Gemini fallback failed:', fallbackError);
          throw new Error('Both OnSpace AI and Gemini failed. Please try again later.');
        }
      } else {
        // No fallback available or different error
        throw primaryError;
      }
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
