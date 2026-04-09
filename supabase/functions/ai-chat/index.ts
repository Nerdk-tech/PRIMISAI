import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const PREXZY_BASE = 'https://apis.prexzyvilla.site';

// PRIMIS AI RAG Knowledge Base - injected into every prompt
const PRIMIS_SYSTEM = `You are PRIMIS AI, a Large Language Model (LLM) created and trained by Damini Codesphere Organization.

IDENTITY:
- Name: PRIMIS AI | Type: LLM | Creator: Damini Codesphere Organization
- Mission: Empower users with intelligent, educational AI assistance across all domains
- PRIMISX: An upcoming virtual robot being developed by Damini Codesphere — a physical/digital AI agent

EDUCATIONAL CAPABILITIES:
- Mathematics: Step-by-step problem solving, algebra, calculus, statistics, geometry
- Science: Physics, Chemistry, Biology, Earth Science, Astronomy
- History & Social Studies: World history, civics, geography, cultures
- Language Arts: Grammar, writing, literature analysis, essay help, creative writing
- Technology & Coding: Any programming language, debugging, algorithms, system design
- Business & Economics: Market analysis, entrepreneurship, finance, management
- Languages: Translation, grammar coaching, vocabulary, conversation practice
- Research: Paper summaries, fact-checking, citations, academic writing

PERSONAS:
1. General Assistant — Versatile helper for any task
2. Academic Tutor — Step-by-step educational guidance
3. Business Consultant — Strategy, market analysis, business planning
4. Duolingo AI — Language learning specialist
5. Forex AI — Financial markets education (educational only)
6. Pro Coder — Advanced programming, architecture, debugging

FORMATTING RULES (STRICT):
- Comparisons or structured data → ALWAYS use markdown tables with | headers |
- Code → ALWAYS use triple backtick code blocks with language name
- Lists → Use bullet points or numbered lists
- "Can you...?" → Answer "Yes! ..." then immediately help
- Be natural and conversational like ChatGPT
- Teach and explain, don't just answer — educational focus
- Respond in the user's language
- Only mention image capabilities when explicitly asked

VALUES: Truth, Education First, Respect, Transparency, Encouragement`;

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

    // Optionally fetch persona for extra context
    let personaContext = '';
    if (personaId) {
      const { data: persona } = await supabaseClient
        .from('personas')
        .select('system_prompt, name, tone')
        .eq('id', personaId)
        .single();

      if (persona) {
        personaContext = `\n\nACTIVE PERSONA: ${persona.name}\n${persona.system_prompt}${persona.tone ? `\nTone: ${persona.tone}` : ''}`;
      }
    }

    // Build the full prompt — system + persona + conversation history (last 10)
    const recentMessages = messages.slice(-10);

    // Format conversation history as readable dialogue
    const history = recentMessages
      .slice(0, -1) // all but last (that's the current question)
      .map((m: any) => `${m.role === 'user' ? 'User' : 'PRIMIS AI'}: ${m.content}`)
      .join('\n');

    const latestUserMessage = recentMessages[recentMessages.length - 1]?.content || '';

    const fullPrompt = `${PRIMIS_SYSTEM}${personaContext}

${history ? `CONVERSATION HISTORY:\n${history}\n` : ''}
User: ${latestUserMessage}
PRIMIS AI:`;

    console.log('Calling Prexzy ai4chat, prompt length:', fullPrompt.length);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000);

    const apiUrl = `${PREXZY_BASE}/ai/ai4chat?prompt=${encodeURIComponent(fullPrompt)}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Prexzy ai4chat error:', errorText);
      throw new Error(`Prexzy API Error: ${errorText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    let content = '';

    if (contentType.includes('application/json')) {
      const data = await response.json();
      console.log('Prexzy response JSON keys:', Object.keys(data));

      // Metadata fields to skip when searching for content
      const SKIP_KEYS = new Set(['status', 'owner', 'version', 'model', 'api', 'code', 'error', 'success', 'ok']);

      // 1. Try known content field names first
      const CONTENT_KEYS = ['response', 'result', 'reply', 'content', 'message', 'text', 'answer', 'data', 'output', 'completion', 'choices'];
      for (const key of CONTENT_KEYS) {
        if (data[key] && typeof data[key] === 'string' && data[key].trim().length > 0) {
          content = data[key].trim();
          break;
        }
        // Handle OpenAI-style choices array
        if (key === 'choices' && Array.isArray(data.choices) && data.choices[0]) {
          const choice = data.choices[0];
          content = choice?.message?.content || choice?.text || '';
          if (content) break;
        }
      }

      // 2. If still empty, scan all string values and pick the longest non-metadata one
      if (!content || content.trim().length < 3) {
        let longest = '';
        for (const [key, val] of Object.entries(data)) {
          if (!SKIP_KEYS.has(key.toLowerCase()) && typeof val === 'string' && val.length > longest.length) {
            longest = val;
          }
        }
        if (longest.length > 3) content = longest;
      }

      // 3. Last resort fallback
      if (!content || content.trim().length < 3) {
        content = JSON.stringify(data);
      }
    } else {
      content = await response.text();
    }

    if (!content || content.trim().length === 0) {
      throw new Error('Empty response from AI');
    }

    // Strip any leading "PRIMIS AI:" prefix the model might echo back
    content = content.replace(/^PRIMIS AI:\s*/i, '').trim();

    console.log('Prexzy response received, length:', content.length);

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
