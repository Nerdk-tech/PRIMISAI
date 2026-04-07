import { useState, useEffect, useRef, useCallback } from 'react';
import { Timer, Play, Pause, RotateCcw, X, Coffee, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Props {
  onClose: () => void;
}

type Mode = 'focus' | 'break';

const FOCUS_MINS = 25;
const BREAK_MINS = 5;

export default function StudyTimer({ onClose }: Props) {
  const [mode, setMode] = useState<Mode>('focus');
  const [timeLeft, setTimeLeft] = useState(FOCUS_MINS * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalTime = mode === 'focus' ? FOCUS_MINS * 60 : BREAK_MINS * 60;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const switchMode = useCallback((next: Mode) => {
    setMode(next);
    setTimeLeft(next === 'focus' ? FOCUS_MINS * 60 : BREAK_MINS * 60);
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (!running) return;

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setRunning(false);

          if (mode === 'focus') {
            setSessions((s) => s + 1);
            toast.success('Focus session complete! Take a 5-minute break.', { duration: 5000 });
            switchMode('break');
          } else {
            toast.success("Break over! Time to focus again.", { duration: 5000 });
            switchMode('focus');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, mode, switchMode]);

  const reset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setTimeLeft(mode === 'focus' ? FOCUS_MINS * 60 : BREAK_MINS * 60);
  };

  // Circumference for SVG circle
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="bg-card/90 border border-border/50 rounded-2xl shadow-2xl w-72 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-gradient-to-r from-cyan-500/10 to-blue-600/10">
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-white">Study Timer</span>
        </div>
        <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/10 transition-colors">
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Mode Tabs */}
      <div className="flex mx-4 mt-4 gap-2">
        {(['focus', 'break'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === m
                ? m === 'focus'
                  ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                  : 'bg-green-500/20 border border-green-500/40 text-green-300'
                : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
            }`}
          >
            {m === 'focus' ? <Brain className="w-3 h-3" /> : <Coffee className="w-3 h-3" />}
            {m === 'focus' ? 'Focus' : 'Break'}
          </button>
        ))}
      </div>

      {/* Timer Circle */}
      <div className="flex flex-col items-center py-6">
        <div className="relative w-36 h-36">
          <svg className="w-36 h-36 -rotate-90" viewBox="0 0 128 128">
            {/* Track */}
            <circle
              cx="64" cy="64" r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="8"
            />
            {/* Progress */}
            <circle
              cx="64" cy="64" r={radius}
              fill="none"
              stroke={mode === 'focus' ? '#22d3ee' : '#4ade80'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000"
            />
          </svg>
          {/* Time display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-white font-mono tracking-tight">{formatTime(timeLeft)}</span>
            <span className="text-xs text-muted-foreground mt-0.5 capitalize">{mode}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={reset}
            className="w-9 h-9 rounded-full bg-muted/40 hover:bg-muted/70 flex items-center justify-center transition-colors"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => setRunning(!running)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
              mode === 'focus'
                ? 'bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/30'
                : 'bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 shadow-green-500/30'
            }`}
          >
            {running
              ? <Pause className="w-6 h-6 text-white" />
              : <Play className="w-6 h-6 text-white ml-0.5" />}
          </button>
          <div className="w-9 h-9 rounded-full bg-muted/20 flex items-center justify-center">
            <span className="text-xs font-bold text-muted-foreground">{sessions}</span>
          </div>
        </div>

        {/* Session dots */}
        {sessions > 0 && (
          <div className="flex gap-1.5 mt-3">
            {Array.from({ length: Math.min(sessions, 8) }).map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-cyan-400/60" />
            ))}
            {sessions > 8 && <span className="text-xs text-muted-foreground ml-1">+{sessions - 8}</span>}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-2">{sessions} session{sessions !== 1 ? 's' : ''} completed</p>
      </div>
    </div>
  );
}
