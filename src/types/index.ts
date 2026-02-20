export interface AuthUser {
  id: string;
  email: string;
  username: string;
  avatar?: string;
}

export interface Persona {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  system_prompt: string;
  tone: string;
  creativity_level: number;
  is_default: boolean;
  is_system_persona: boolean;
  created_at: string;
  updated_at: string;
}

export interface Chat {
  id: string;
  user_id: string;
  persona_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: {
    type: 'image' | 'video' | 'audio';
    url: string;
    name: string;
  }[];
  created_at: string;
}

export interface SavedContent {
  id: string;
  user_id: string;
  type: 'image' | 'video' | 'chat';
  title: string | null;
  description: string | null;
  content_url: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface UserSettings {
  user_id: string;
  selected_voice: string;
  selected_persona_id: string | null;
  theme: string;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type VoiceOption = {
  id: string;
  name: string;
  description: string;
};

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral and balanced' },
  { id: 'echo', name: 'Echo', description: 'Warm and friendly' },
  { id: 'fable', name: 'Fable', description: 'Expressive storyteller' },
  { id: 'onyx', name: 'Onyx', description: 'Deep and authoritative' },
  { id: 'nova', name: 'Nova', description: 'Energetic and young' },
];
