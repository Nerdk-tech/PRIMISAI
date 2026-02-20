import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN') || 'primis-ai-webhook-verify';
const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_TOKEN');
const WHATSAPP_PHONE_ID = Deno.env.get('WHATSAPP_PHONE_ID');
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL');

const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');
const geminiKey = Deno.env.get('GEMINI_API_KEY');

Deno.serve(async (req) => {
  // Handle webhook verification (GET request)
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WhatsApp webhook verified');
      return new Response(challenge, { status: 200 });
    }

    return new Response('Forbidden', { status: 403 });
  }

  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Handle incoming messages (POST request)
  try {
    const body = await req.json();
    console.log('WhatsApp webhook received:', JSON.stringify(body, null, 2));

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const message = messages[0];
    const from = message.from; // WhatsApp user phone number
    const messageText = message.text?.body || '';
    const messageType = message.type;

    console.log(`Message from ${from}: ${messageText}`);

    // Only process text messages for now
    if (messageType !== 'text') {
      await sendWhatsAppMessage(from, 'I can only process text messages at the moment.');
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get AI response
    let aiResponse = '';
    
    try {
      // Try OnSpace AI first
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { 
              role: 'system', 
              content: 'You are PRIMIS AI WhatsApp assistant. Keep responses concise and helpful. Format for WhatsApp (no markdown, use plain text).'
            },
            { role: 'user', content: messageText }
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        aiResponse = data.choices?.[0]?.message?.content ?? '';
      } else {
        throw new Error('OnSpace AI failed');
      }
    } catch (error) {
      console.log('OnSpace AI failed, trying Gemini fallback...');
      
      // Fallback to Gemini
      try {
        const systemPrompt = 'You are PRIMIS AI WhatsApp assistant. Keep responses concise and helpful. Format for WhatsApp (no markdown, use plain text).';
        
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `${systemPrompt}\n\nUser: ${messageText}` }]
                }
              ],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 500,
              },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        }
      } catch (geminiError) {
        console.error('Gemini fallback failed:', geminiError);
        aiResponse = 'Sorry, I am currently experiencing technical difficulties. Please try again later.';
      }
    }

    // Send response back via WhatsApp
    await sendWhatsAppMessage(from, aiResponse);

    // Log to admin database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabase.from('whatsapp_messages').insert({
      phone_number: from,
      message_type: 'received',
      content: messageText,
      response: aiResponse,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('WhatsApp webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendWhatsAppMessage(to: string, message: string) {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    console.error('WhatsApp credentials not configured');
    return;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: { body: message },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('WhatsApp send error:', error);
    }
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error);
  }
}
