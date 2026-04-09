import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { X, Search, BookmarkCheck, Trash2, Copy, Check, FileText, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  onClose: () => void;
}

interface Note {
  id: string;
  title: string;
  description: string;
  metadata: { fullContent?: string; savedAt?: string };
  created_at: string;
}

export default function NotesLibraryPanel({ onClose }: Props) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('saved_content')
      .select('*')
      .eq('user_id', user!.id)
      .eq('type', 'chat')
      .order('created_at', { ascending: false });

    setNotes((data as Note[]) ?? []);
    setLoading(false);
  };

  const deleteNote = async (id: string) => {
    const { error } = await supabase.from('saved_content').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete note');
    } else {
      toast.success('Note deleted');
      setNotes(prev => prev.filter(n => n.id !== id));
      if (expanded === id) setExpanded(null);
    }
  };

  const copyNote = async (note: Note) => {
    const text = note.metadata?.fullContent || note.description || note.title || '';
    await navigator.clipboard.writeText(text);
    setCopied(note.id);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(null), 2000);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return notes;
    const q = search.toLowerCase();
    return notes.filter(n =>
      n.title?.toLowerCase().includes(q) ||
      n.description?.toLowerCase().includes(q) ||
      n.metadata?.fullContent?.toLowerCase().includes(q)
    );
  }, [notes, search]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Highlight search matches
  const highlight = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} className="bg-cyan-500/30 text-cyan-200 rounded px-0.5">{part}</mark> : part
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#001a33] border border-cyan-500/30 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-cyan-500/10">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/40 shrink-0 bg-gradient-to-r from-cyan-500/10 to-blue-600/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <BookmarkCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Notes Library</h2>
              <p className="text-xs text-cyan-400/70">{notes.length} saved note{notes.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border/20 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search notes..."
              className="w-full bg-muted/30 border border-border/40 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 text-white placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-cyan-500/40 border-t-cyan-500 rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-muted/20 flex items-center justify-center">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">
                {search ? 'No notes match your search' : 'No notes saved yet'}
              </p>
              <p className="text-xs text-muted-foreground text-center max-w-xs">
                {search ? 'Try a different search term' : 'Click "Save as note" on any AI message to save it here'}
              </p>
            </div>
          ) : (
            filtered.map(note => {
              const isExpanded = expanded === note.id;
              const fullText = note.metadata?.fullContent || note.description || '';
              const preview = fullText.slice(0, 120) + (fullText.length > 120 ? '...' : '');
              const displayTitle = note.title?.replace(/^Note:\s*/i, '') || 'Untitled Note';

              return (
                <div
                  key={note.id}
                  className="bg-muted/20 border border-border/30 hover:border-cyan-500/30 rounded-xl transition-all"
                >
                  {/* Note Header */}
                  <button
                    className="w-full text-left p-4 flex items-start gap-3"
                    onClick={() => setExpanded(isExpanded ? null : note.id)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {highlight(displayTitle, search)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {highlight(preview, search)}
                      </p>
                      <div className="flex items-center gap-1 mt-2">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{formatDate(note.created_at)}</span>
                      </div>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4">
                      <div className="bg-black/20 border border-border/20 rounded-xl p-4 max-h-48 overflow-y-auto">
                        <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                          {highlight(fullText, search)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 px-4 pb-3 border-t border-border/20 pt-2">
                    <button
                      onClick={() => copyNote(note)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-cyan-400 transition-colors px-2 py-1 rounded-lg hover:bg-cyan-500/10"
                    >
                      {copied === note.id ? (
                        <><Check className="w-3.5 h-3.5 text-green-400" /><span className="text-green-400">Copied!</span></>
                      ) : (
                        <><Copy className="w-3.5 h-3.5" />Copy</>
                      )}
                    </button>
                    <button
                      onClick={() => setExpanded(isExpanded ? null : note.id)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/10"
                    >
                      {isExpanded ? 'Collapse' : 'Expand'}
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {notes.length > 0 && (
          <div className="p-4 border-t border-border/20 shrink-0">
            <p className="text-xs text-center text-muted-foreground">
              {filtered.length} of {notes.length} notes shown
              {search && ` · Searching for "${search}"`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
