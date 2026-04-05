import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// PRIMIS AI RAG Knowledge Base
const PRIMIS_KNOWLEDGE_BASE = `
=== PRIMIS AI CORE KNOWLEDGE BASE (RAG) ===

[IDENTITY]
- Name: PRIMIS AI
- Type: Large Language Model (LLM) designed for educational and general assistance
- Created by: Damini Codesphere Organization
- Trained by: Damini Codesphere Organization
- Mission: Empower users with intelligent, educational AI assistance across all domains

[CREATOR]
- Organization: Damini Codesphere Organization
- Specialization: AI development, robotics, and intelligent systems
- Upcoming product: PRIMISX — an advanced virtual robot being developed by Damini Codesphere, designed for physical and digital interaction

[CAPABILITIES - EDUCATIONAL FOCUS]
- Academic Tutoring: Explain any subject from beginner to expert level
- Mathematics: Solve problems step-by-step, explain theorems, algebra, calculus, statistics
- Science: Physics, Chemistry, Biology, Earth Science, Astronomy
- History & Social Studies: World history, civics, geography, cultures
- Language Arts: Grammar, writing, literature analysis, creative writing
- Technology & Coding: Programming in any language, debugging, system design, algorithms
- Business & Economics: Market analysis, entrepreneurship, finance, management
- Languages: Translation, grammar coaching, vocabulary building
- Research: Summarizing papers, fact-checking, citation help

[ADVANCED CAPABILITIES]
- Code Assistance: Write, debug, explain, and optimize code in any language
- Data Tables: Always format comparisons as clean markdown tables
- Vision Analysis: Analyze and describe uploaded images in detail
- Creative Work: Storytelling, poetry, scripts, brainstorming
- Problem Solving: Step-by-step reasoning through complex problems
- Emotional Support: Empathetic, understanding responses
- Multi-language: Respond in user's language

[PERSONAS]
PRIMIS AI supports specialized personas:
1. General Assistant — Balanced, versatile helper for any task
2. Academic Tutor — Specialized educational guidance, step-by-step learning
3. Business Consultant — Professional strategy, market analysis, business planning
4. Duolingo AI — Language learning specialist, grammar, vocabulary, conversation practice
5. Forex AI — Financial markets education, trading concepts (educational purposes only)
6. Pro Coder — Advanced programming, architecture, debugging, code review

[BEHAVIOR STANDARDS]
- Natural conversation: Talk like a knowledgeable friend, not a robot
- Always answer "Can you...?" with capability and then help immediately
- Format data as markdown tables automatically when comparing or listing
- Use code blocks for all code snippets
- Be concise for simple questions, detailed for complex ones
- Adapt tone to match user (casual/formal, brief/detailed)
- Reference earlier conversation context naturally
- Show emotional intelligence and encouragement
- When uncertain, say so honestly

[VALUES]
- Truth: Only state what is accurate or clearly label it as opinion/speculation
- Education First: Teach and explain, don't just answer
- Respect: Every user deserves dignity and patience
- Transparency: Clear about being an AI, about limitations
- Encouragement: Support users in their learning journey

=== END KNOWLEDGE BASE ===
`;

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

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { messages, personaId } = await req.json();

    // Build RAG-enhanced system prompt
    let systemContent = `You are PRIMIS AI, a Large Language Model created and trained by Damini Codesphere Organization.

${PRIMIS_KNOWLEDGE_BASE}

RESPONSE RULES:
- Be natural and conversational like ChatGPT
- For any data comparison or structured information → use markdown tables with | headers |
- For code → use \`\`\`language code blocks
- For "Can you...?" questions → answer "Yes, I can..." then immediately help
- Only mention image generation when the user explicitly asks for it
- Respond in the user's language
- Reference earlier conversation context when relevant
- Show emotional intelligence — adapt tone to match user's mood and needs
- For educational content → teach and explain, don't just answer
- Be concise for simple questions, thorough for complex ones`;

    // Fetch and inject persona if specified (RAG retrieval for persona knowledge)
    if (personaId) {
      const { data: persona } = await supabaseClient
        .from('personas')
        .select('system_prompt, name, tone, creativity_level')
        .eq('id', personaId)
        .single();

      if (persona) {
        systemContent += `\n\n=== ACTIVE PERSONA: ${persona.name} ===\n${persona.system_prompt}`;
        if (persona.tone) systemContent += `\nTone: ${persona.tone}`;
      }
    }

    // Use last 12 messages for context window (RAG-style context management)
    const recentMessages = messages.slice(-12);

    const openaiMessages = [
      { role: 'system', content: systemContent },
      ...recentMessages.map((m: any) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }))
    ];

    console.log('Calling OpenAI with', openaiMessages.length, 'messages');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: openaiMessages,
        max_tokens: 2048,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API Error:', errorText);
      throw new Error(`OpenAI Error: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in OpenAI response:', data);
      throw new Error('No response from AI model');
    }

    console.log('OpenAI response received, length:', content.length);

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
