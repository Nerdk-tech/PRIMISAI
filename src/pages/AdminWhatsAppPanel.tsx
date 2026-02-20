import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Phone, Settings, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface WhatsAppMessage {
  id: string;
  phone_number: string;
  message_type: string;
  content: string;
  response?: string;
  created_at: string;
}

export default function AdminWhatsAppPanel() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [stats, setStats] = useState({ total: 0, today: 0 });

  useEffect(() => {
    checkConfiguration();
    loadMessages();
    
    // Refresh every 10 seconds
    const interval = setInterval(loadMessages, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkConfiguration = async () => {
    // Check if WhatsApp credentials are set
    const { data, error } = await supabase.functions.invoke('whatsapp-webhook', {
      body: { action: 'check_config' },
    });
    
    setIsConfigured(!error && data?.configured);
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setMessages(data || []);

      // Calculate stats
      const today = new Date().toDateString();
      const todayCount = data?.filter(m => 
        new Date(m.created_at).toDateString() === today
      ).length || 0;

      setStats({
        total: data?.length || 0,
        today: todayCount,
      });
    } catch (error: any) {
      console.error('Failed to load WhatsApp messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyWebhookUrl = () => {
    const webhookUrl = `${window.location.origin.replace('https://', 'https://').replace('.onspace.app', '.backend.onspace.ai')}/functions/v1/whatsapp-webhook`;
    navigator.clipboard.writeText(webhookUrl);
    toast.success('Webhook URL copied to clipboard');
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-[#001a33] via-[#002244] to-[#001133]">
      {/* Header */}
      <div className="border-b border-border bg-card/30 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <Phone className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">WhatsApp AI Integration</h1>
              <p className="text-sm text-muted-foreground">Admin Panel - {user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isConfigured ? (
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm">Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-yellow-500">
                <XCircle className="w-5 h-5" />
                <span className="text-sm">Not Configured</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-card/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total Messages</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-card/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Today</p>
            <p className="text-2xl font-bold">{stats.today}</p>
          </div>
          <div className="bg-card/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="text-2xl font-bold">{isConfigured ? 'Active' : 'Setup'}</p>
          </div>
        </div>
      </div>

      {/* Configuration Instructions */}
      {!isConfigured && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6 m-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Setup WhatsApp Integration
          </h3>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-2">
              <span className="font-bold">1.</span>
              <div>
                <p className="font-medium">Create WhatsApp Business Account</p>
                <p className="text-muted-foreground">Go to <a href="https://business.facebook.com/" target="_blank" className="text-primary underline">Meta Business</a> and create a WhatsApp Business API account</p>
              </div>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">2.</span>
              <div>
                <p className="font-medium">Get Your Credentials</p>
                <p className="text-muted-foreground">Get your Phone Number ID and Access Token from Meta</p>
              </div>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">3.</span>
              <div>
                <p className="font-medium">Configure Webhook</p>
                <Button onClick={copyWebhookUrl} size="sm" className="mt-2">
                  Copy Webhook URL
                </Button>
                <p className="text-muted-foreground mt-2">Add this URL to your WhatsApp Business webhook settings</p>
              </div>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">4.</span>
              <div>
                <p className="font-medium">Add Credentials to OnSpace Cloud</p>
                <p className="text-muted-foreground">Go to Cloud → Secrets and add:</p>
                <ul className="mt-2 space-y-1 ml-4">
                  <li>• <code className="bg-muted px-1 rounded">WHATSAPP_TOKEN</code> (Your Access Token)</li>
                  <li>• <code className="bg-muted px-1 rounded">WHATSAPP_PHONE_ID</code> (Your Phone Number ID)</li>
                  <li>• <code className="bg-muted px-1 rounded">WHATSAPP_VERIFY_TOKEN</code> (Any random string, e.g., "primis-ai-2026")</li>
                </ul>
              </div>
            </li>
          </ol>
        </div>
      )}

      {/* Messages Log */}
      <div className="flex-1 p-6 overflow-hidden flex flex-col">
        <h2 className="text-xl font-semibold mb-4">Recent Messages</h2>
        
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No WhatsApp messages yet</p>
              <p className="text-sm mt-2">Messages will appear here when users contact your WhatsApp number</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className="bg-card/50 rounded-lg p-4 border border-border">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-green-500" />
                      <span className="font-medium">{msg.phone_number}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.created_at).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">User Message:</p>
                      <p className="text-sm">{msg.content}</p>
                    </div>
                    
                    {msg.response && (
                      <div className="bg-primary/10 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">AI Response:</p>
                        <p className="text-sm">{msg.response}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
