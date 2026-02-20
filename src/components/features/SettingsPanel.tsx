import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, User, Volume2, Brain, Plus, Trash2 } from 'lucide-react';
import type { Persona, UserSettings } from '@/types';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import PremiumTTSPanel from './PremiumTTSPanel';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onPersonaChange: () => void;
}

export default function SettingsPanel({ isOpen, onClose, onPersonaChange }: SettingsPanelProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'account' | 'personas' | 'voice'>('account');
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [showCreatePersona, setShowCreatePersona] = useState(false);
  const [newPersona, setNewPersona] = useState({
    name: '',
    description: '',
    system_prompt: '',
    tone: 'balanced',
  });

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      loadPersonas();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user!.id)
      .single();
    
    if (data) setUserSettings(data);
  };

  const loadPersonas = async () => {
    const { data } = await supabase
      .from('personas')
      .select('*')
      .or(`user_id.eq.${user!.id},is_system_persona.eq.true`)
      .order('created_at', { ascending: false });
    
    if (data) setPersonas(data);
  };

  const selectPersona = async (personaId: string) => {
    const { error } = await supabase
      .from('user_settings')
      .update({ selected_persona_id: personaId })
      .eq('user_id', user!.id);

    if (error) {
      toast.error('Failed to update persona');
    } else {
      toast.success('Persona updated successfully');
      loadSettings();
      onPersonaChange();
    }
  };

  const createPersona = async () => {
    if (!newPersona.name.trim() || !newPersona.system_prompt.trim()) {
      toast.error('Name and system prompt are required');
      return;
    }

    const { data, error } = await supabase
      .from('personas')
      .insert({
        user_id: user!.id,
        name: newPersona.name,
        description: newPersona.description,
        system_prompt: newPersona.system_prompt,
        tone: newPersona.tone,
        is_default: false,
        is_system_persona: false,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create persona');
    } else {
      toast.success('Persona created successfully');
      setPersonas([data, ...personas]);
      setShowCreatePersona(false);
      setNewPersona({ name: '', description: '', system_prompt: '', tone: 'balanced' });
    }
  };

  const deletePersona = async (personaId: string) => {
    const { error } = await supabase
      .from('personas')
      .delete()
      .eq('id', personaId);

    if (error) {
      toast.error('Failed to delete persona');
    } else {
      toast.success('Persona deleted successfully');
      loadPersonas();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-2xl font-bold">Settings</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-4 border-b border-border">
          <Button
            variant={activeTab === 'account' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('account')}
          >
            <User className="w-4 h-4 mr-2" />
            Account
          </Button>
          <Button
            variant={activeTab === 'personas' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('personas')}
          >
            <Brain className="w-4 h-4 mr-2" />
            Personas
          </Button>
          <Button
            variant={activeTab === 'voice' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('voice')}
          >
            <Volume2 className="w-4 h-4 mr-2" />
            Voice
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-6">
          {activeTab === 'account' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Account Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-muted-foreground">Username</label>
                    <p className="text-lg">{user?.username}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Email</label>
                    <p className="text-lg">{user?.email}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'voice' && (
            <PremiumTTSPanel
              selectedVoice={userSettings?.selected_voice || 'alloy'}
              onVoiceChange={async (voiceId) => {
                try {
                  const { error } = await supabase
                    .from('user_settings')
                    .update({ selected_voice: voiceId })
                    .eq('user_id', user!.id);
                  
                  if (error) throw error;
                  
                  setUserSettings({ ...userSettings!, selected_voice: voiceId });
                  toast.success('Voice updated');
                } catch (error) {
                  toast.error('Failed to update voice');
                }
              }}
            />
          )}

          {activeTab === 'personas' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">AI Personas</h3>
                <Button
                  onClick={() => setShowCreatePersona(!showCreatePersona)}
                  size="sm"
                  className="bg-primary hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Persona
                </Button>
              </div>

              {showCreatePersona && (
                <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                  <Input
                    placeholder="Persona name"
                    value={newPersona.name}
                    onChange={(e) => setNewPersona({ ...newPersona, name: e.target.value })}
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={newPersona.description}
                    onChange={(e) => setNewPersona({ ...newPersona, description: e.target.value })}
                  />
                  <Textarea
                    placeholder="System prompt (defines persona behavior)"
                    value={newPersona.system_prompt}
                    onChange={(e) => setNewPersona({ ...newPersona, system_prompt: e.target.value })}
                    rows={4}
                  />
                  <div className="flex gap-2">
                    <Button onClick={createPersona} className="bg-primary hover:bg-primary/90">
                      Create
                    </Button>
                    <Button variant="ghost" onClick={() => setShowCreatePersona(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {personas.map((persona) => (
                  <div
                    key={persona.id}
                    className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      userSettings?.selected_persona_id === persona.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => selectPersona(persona.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{persona.name}</h4>
                          {persona.is_system_persona && (
                            <span className="text-xs px-2 py-0.5 bg-accent/20 text-accent rounded">System</span>
                          )}
                        </div>
                        {persona.description && (
                          <p className="text-sm text-muted-foreground mt-1">{persona.description}</p>
                        )}
                      </div>
                      {!persona.is_system_persona && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePersona(persona.id);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
