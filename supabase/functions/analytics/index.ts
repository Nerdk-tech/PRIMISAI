import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const ADMIN_EMAIL = 'damibotzinc@gmail.com';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email || email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ── Overview stats ──────────────────────────────────────────
    const [
      { count: totalUsers },
      { count: totalChats },
      { count: totalMessages },
      { count: totalSaved },
      { count: messagesToday },
      { count: chatsThisWeek },
      { count: newChatsToday },
    ] = await Promise.all([
      supabaseAdmin.from('user_profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('chats').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('messages').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('saved_content').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('messages').select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 86400000).toISOString()),
      supabaseAdmin.from('chats').select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
      supabaseAdmin.from('chats').select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 86400000).toISOString()),
    ]);

    // ── Recent users (last 10) ──────────────────────────────────
    const { data: recentUsers } = await supabaseAdmin
      .from('user_profiles')
      .select('id, username, email')
      .order('id', { ascending: false })
      .limit(10);

    // ── Top personas by usage ───────────────────────────────────
    const { data: personaUsage } = await supabaseAdmin
      .from('chats')
      .select('persona_id, personas(name)')
      .not('persona_id', 'is', null)
      .limit(500);

    const personaCounts: Record<string, { name: string; count: number }> = {};
    for (const chat of personaUsage ?? []) {
      const id = chat.persona_id;
      const name = (chat.personas as any)?.name ?? 'Unknown';
      if (!personaCounts[id]) personaCounts[id] = { name, count: 0 };
      personaCounts[id].count++;
    }
    const topPersonas = Object.values(personaCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // ── Daily messages for last 7 days ──────────────────────────
    const { data: weekMessages } = await supabaseAdmin
      .from('messages')
      .select('created_at, role')
      .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())
      .order('created_at', { ascending: true });

    const dailyBuckets: Record<string, { user: number; assistant: number }> = {};
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = days[d.getDay()];
      dailyBuckets[key] = { user: 0, assistant: 0 };
    }
    for (const msg of weekMessages ?? []) {
      const d = new Date(msg.created_at);
      const key = days[d.getDay()];
      if (dailyBuckets[key]) {
        if (msg.role === 'user') dailyBuckets[key].user++;
        else dailyBuckets[key].assistant++;
      }
    }
    const dailyActivity = Object.entries(dailyBuckets).map(([day, counts]) => ({
      day,
      messages: counts.user + counts.assistant,
    }));

    // ── Image generations (from storage) ───────────────────────
    const { data: storageFiles } = await supabaseAdmin
      .storage.from('generated-images')
      .list('', { limit: 1000 });
    const totalImages = storageFiles?.length ?? 0;

    // ── WhatsApp messages ───────────────────────────────────────
    const { count: whatsappCount } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('*', { count: 'exact', head: true });

    return new Response(
      JSON.stringify({
        overview: {
          totalUsers: totalUsers ?? 0,
          totalChats: totalChats ?? 0,
          totalMessages: totalMessages ?? 0,
          totalSaved: totalSaved ?? 0,
          messagesToday: messagesToday ?? 0,
          chatsThisWeek: chatsThisWeek ?? 0,
          newChatsToday: newChatsToday ?? 0,
          totalImages,
          whatsappMessages: whatsappCount ?? 0,
        },
        recentUsers: recentUsers ?? [],
        topPersonas,
        dailyActivity,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Analytics error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
