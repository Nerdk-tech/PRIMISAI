import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';
import {
  Users, MessageSquare, Image, Bookmark, BarChart3,
  TrendingUp, X, Loader2, Mail, Lock, Bot,
  Activity, Zap, MessageCircle, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    totalChats: number;
    totalMessages: number;
    totalSaved: number;
    messagesToday: number;
    chatsThisWeek: number;
    newChatsToday: number;
    totalImages: number;
    whatsappMessages: number;
  };
  recentUsers: { id: string; username: string | null; email: string }[];
  topPersonas: { name: string; count: number }[];
  dailyActivity: { day: string; messages: number }[];
}

interface Props {
  onClose: () => void;
}

const ADMIN_EMAIL = 'damibotzinc@gmail.com';

export default function AnalyticsPanel({ onClose }: Props) {
  const [step, setStep] = useState<'email' | 'loading' | 'data'>('email');
  const [emailInput, setEmailInput] = useState('');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (!emailInput.trim()) {
      setError('Please enter your email.');
      return;
    }
    if (emailInput.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      setError('Access denied. This section is restricted.');
      return;
    }

    setError('');
    setStep('loading');

    try {
      const { data, error: fnError } = await supabase.functions.invoke('analytics', {
        body: { email: emailInput },
      });

      if (fnError) {
        let msg = fnError.message;
        if (fnError instanceof FunctionsHttpError) {
          try {
            const txt = await fnError.context?.text();
            msg = txt || msg;
          } catch { /* ignore */ }
        }
        throw new Error(msg);
      }

      setAnalytics(data);
      setStep('data');
    } catch (err: any) {
      toast.error(err.message || 'Failed to load analytics');
      setStep('email');
    }
  };

  const maxMessages = Math.max(...(analytics?.dailyActivity.map(d => d.messages) ?? [1]), 1);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#001a33] border border-cyan-500/30 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-cyan-500/10">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">PRIMIS Analytics</h2>
              <p className="text-xs text-cyan-400/70">Admin Dashboard</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Email Gate */}
        {step === 'email' && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-sm space-y-6 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center mx-auto">
                <Lock className="w-8 h-8 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-1">Restricted Access</h3>
                <p className="text-sm text-muted-foreground">Enter your admin email to view analytics</p>
              </div>
              <div className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => { setEmailInput(e.target.value); setError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                    placeholder="Admin email address"
                    autoFocus
                    className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                  />
                </div>
                {error && (
                  <p className="text-xs text-red-400 text-left">{error}</p>
                )}
                <Button
                  onClick={handleVerify}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold"
                >
                  Access Dashboard
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {step === 'loading' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">Fetching analytics data...</p>
            </div>
          </div>
        )}

        {/* Analytics Data */}
        {step === 'data' && analytics && (
          <div className="flex-1 overflow-y-auto p-5 space-y-6">

            {/* Overview Cards */}
            <div>
              <h3 className="text-xs font-semibold text-cyan-400/70 uppercase tracking-widest mb-3">Overview</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Total Users', value: analytics.overview.totalUsers, icon: Users, color: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/30', text: 'text-blue-300' },
                  { label: 'Total Chats', value: analytics.overview.totalChats, icon: MessageSquare, color: 'from-purple-500/20 to-pink-500/20', border: 'border-purple-500/30', text: 'text-purple-300' },
                  { label: 'Total Messages', value: analytics.overview.totalMessages, icon: MessageCircle, color: 'from-green-500/20 to-emerald-500/20', border: 'border-green-500/30', text: 'text-green-300' },
                  { label: 'Images Generated', value: analytics.overview.totalImages, icon: Image, color: 'from-orange-500/20 to-yellow-500/20', border: 'border-orange-500/30', text: 'text-orange-300' },
                  { label: 'Messages Today', value: analytics.overview.messagesToday, icon: Zap, color: 'from-yellow-500/20 to-amber-500/20', border: 'border-yellow-500/30', text: 'text-yellow-300' },
                  { label: 'Chats This Week', value: analytics.overview.chatsThisWeek, icon: TrendingUp, color: 'from-cyan-500/20 to-teal-500/20', border: 'border-cyan-500/30', text: 'text-cyan-300' },
                  { label: 'Saved Content', value: analytics.overview.totalSaved, icon: Bookmark, color: 'from-pink-500/20 to-rose-500/20', border: 'border-pink-500/30', text: 'text-pink-300' },
                  { label: 'WhatsApp Msgs', value: analytics.overview.whatsappMessages, icon: Activity, color: 'from-lime-500/20 to-green-500/20', border: 'border-lime-500/30', text: 'text-lime-300' },
                ].map((stat) => (
                  <div key={stat.label} className={`bg-gradient-to-br ${stat.color} border ${stat.border} rounded-xl p-4`}>
                    <div className={`${stat.text} mb-2`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <p className="text-2xl font-bold text-white">{stat.value.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily Activity Chart */}
            <div>
              <h3 className="text-xs font-semibold text-cyan-400/70 uppercase tracking-widest mb-3">7-Day Message Activity</h3>
              <div className="bg-muted/20 border border-border/50 rounded-xl p-4">
                <div className="flex items-end gap-2 h-28">
                  {analytics.dailyActivity.map((day) => {
                    const height = maxMessages > 0 ? Math.max((day.messages / maxMessages) * 100, 4) : 4;
                    return (
                      <div key={day.day} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs text-muted-foreground">{day.messages > 0 ? day.messages : ''}</span>
                        <div
                          className="w-full bg-gradient-to-t from-cyan-500 to-blue-400 rounded-t-md transition-all"
                          style={{ height: `${height}%` }}
                        />
                        <span className="text-xs text-muted-foreground">{day.day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Top Personas */}
              <div>
                <h3 className="text-xs font-semibold text-cyan-400/70 uppercase tracking-widest mb-3">Top Personas</h3>
                <div className="bg-muted/20 border border-border/50 rounded-xl divide-y divide-border/30">
                  {analytics.topPersonas.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground text-center">No persona usage yet</p>
                  ) : (
                    analytics.topPersonas.map((p, i) => (
                      <div key={p.name} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
                          <Bot className="w-3 h-3 text-cyan-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{p.name}</p>
                          <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                              style={{ width: `${(p.count / (analytics.topPersonas[0]?.count || 1)) * 100}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-xs text-cyan-400 font-mono shrink-0">{p.count}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Users */}
              <div>
                <h3 className="text-xs font-semibold text-cyan-400/70 uppercase tracking-widest mb-3">Recent Users</h3>
                <div className="bg-muted/20 border border-border/50 rounded-xl divide-y divide-border/30">
                  {analytics.recentUsers.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground text-center">No users yet</p>
                  ) : (
                    analytics.recentUsers.slice(0, 8).map((u) => (
                      <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/30 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-purple-300">
                            {(u.username || u.email || '?').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">{u.username || 'No username'}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
