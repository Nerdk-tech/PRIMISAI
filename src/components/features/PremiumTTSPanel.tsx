import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';

interface Voice {
  id: string;
  name: string;
  gender: 'male' | 'female';
  description: string;
}

const PREMIUM_VOICES: Voice[] = [
  { id: 'alloy', name: 'Alloy', gender: 'male', description: 'Clear, balanced male voice' },
  { id: 'echo', name: 'Echo', gender: 'male', description: 'Deep, resonant male voice' },
  { id: 'fable', name: 'Fable', gender: 'male', description: 'Warm, storytelling male voice' },
  { id: 'nova', name: 'Nova', gender: 'female', description: 'Energetic, modern female voice' },
  { id: 'shimmer', name: 'Shimmer', gender: 'female', description: 'Smooth, professional female voice' },
];

interface PremiumTTSPanelProps {
  selectedVoice: string;
  onVoiceChange: (voiceId: string) => void;
}

export default function PremiumTTSPanel({ selectedVoice, onVoiceChange }: PremiumTTSPanelProps) {
  const [testingVoice, setTestingVoice] = useState<string | null>(null);

  const testVoice = async (voiceId: string) => {
    setTestingVoice(voiceId);
    
    try {
      const voiceName = PREMIUM_VOICES.find(v => v.id === voiceId)?.name;
      const testText = `Hello, I'm ${voiceName}. This is my voice.`;

      const { data, error } = await supabase.functions.invoke('ai-tts', {
        body: {
          text: testText,
          voice: voiceId,
        },
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
          } catch {
            errorMessage = `${error.message || 'Failed to read response'}`;
          }
        }
        throw new Error(errorMessage);
      }

      // Play the audio
      const audio = new Audio(data.audio);
      audio.onended = () => setTestingVoice(null);
      audio.onerror = () => {
        setTestingVoice(null);
        toast.error('Failed to play voice');
      };
      await audio.play();
    } catch (error: any) {
      console.error('Voice test error:', error);
      setTestingVoice(null);
      toast.error(error.message || 'Failed to test voice');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Premium Voices</h3>
        <p className="text-xs text-muted-foreground">
          Select a realistic AI voice for text-to-speech
        </p>
      </div>

      <div className="space-y-2">
        {PREMIUM_VOICES.map((voice) => (
          <div
            key={voice.id}
            className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
              selectedVoice === voice.id
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => onVoiceChange(voice.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{voice.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    voice.gender === 'male' 
                      ? 'bg-blue-500/20 text-blue-400' 
                      : 'bg-pink-500/20 text-pink-400'
                  }`}>
                    {voice.gender === 'male' ? '♂ Male' : '♀ Female'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {voice.description}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  testVoice(voice.id);
                }}
                disabled={testingVoice === voice.id}
              >
                {testingVoice === voice.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>


    </div>
  );
}
