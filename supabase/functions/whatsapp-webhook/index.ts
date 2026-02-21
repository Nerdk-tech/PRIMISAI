import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN') || 'primis-ai-webhook-verify';
const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_TOKEN');
const WHATSAPP_PHONE_ID = Deno.env.get('WHATSAPP_PHONE_ID');
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL');

const prexzyApiBase = 'https://apis.prexzyvilla.site';

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

    // Get AI response using Prexzy GPT-5 API
    let aiResponse = '';
    
    try {
      const systemPrompt = 'You are PRIMIS AI WhatsApp assistant. Keep responses concise and helpful. Format for WhatsApp (no markdown, use plain text).';
      const prompt = `${systemPrompt}\n\nUser: ${messageText}`;
      
      const response = await fetch(`${prexzyApiBase}/ai/gpt-5?text=${encodeURIComponent(prompt)}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Prexzy API request failed');
      }

      const data = await response.json();
      console.log('WhatsApp - Prexzy API Response:', JSON.stringify(data));
      
      aiResponse = data.text || data.response || data.result || data.content || '';
      
      if (!aiResponse) {
        throw new Error('No text in Prexzy API response');
      }
    } catch (error) {
      console.error('Prexzy GPT-5 API error:', error);
      aiResponse = 'Sorry, I am currently experiencing technical difficulties. Please try again later.';
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
