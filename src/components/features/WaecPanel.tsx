import { useState } from 'react';
import {
  GraduationCap, X, Loader2, ChevronRight, CheckCircle2,
  XCircle, RotateCcw, BookOpen, ChevronDown, ChevronUp, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Props {
  onClose: () => void;
}

interface WaecQuestion {
  year?: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  topic: string;
}

const WAEC_SUBJECTS = [
  { id: 'mathematics', label: 'Mathematics', emoji: '📐' },
  { id: 'english_language', label: 'English Language', emoji: '📝' },
  { id: 'physics', label: 'Physics', emoji: '⚛️' },
  { id: 'chemistry', label: 'Chemistry', emoji: '🧪' },
  { id: 'biology', label: 'Biology', emoji: '🧬' },
  { id: 'economics', label: 'Economics', emoji: '📊' },
  { id: 'government', label: 'Government', emoji: '🏛️' },
  { id: 'geography', label: 'Geography', emoji: '🌍' },
  { id: 'literature', label: 'Literature in English', emoji: '📚' },
  { id: 'further_mathematics', label: 'Further Mathematics', emoji: '∞' },
  { id: 'commerce', label: 'Commerce', emoji: '💼' },
  { id: 'financial_accounting', label: 'Financial Accounting', emoji: '💰' },
];

const YEAR_RANGES = ['2019-2023', '2015-2018', '2010-2014', '2005-2009'];

type Step = 'setup' | 'loading' | 'practice';

export default function WaecPanel({ onClose }: Props) {
  const [step, setStep] = useState<Step>('setup');
  const [subject, setSubject] = useState('mathematics');
  const [yearRange, setYearRange] = useState('2019-2023');
  const [questions, setQuestions] = useState<WaecQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);

  const generateQuestions = async () => {
    setStep('loading');
    try {
      const subjectLabel = WAEC_SUBJECTS.find(s => s.id === subject)?.label || subject;

      const prompt = `Generate 15 WAEC (West African Examination Council) past questions for ${subjectLabel} from approximately ${yearRange}.

These should be authentic WAEC-style exam questions with West African context.

Return ONLY a valid JSON array (no markdown) in this exact format:
[
  {
    "year": "2022",
    "topic": "Topic name",
    "question": "Full question text",
    "options": ["A. Option one", "B. Option two", "C. Option three", "D. Option four"],
    "correct": 0,
    "explanation": "Detailed explanation of why this is correct and why others are wrong"
  }
]

Rules:
- correct is the 0-based index (0=A, 1=B, 2=C, 3=D)
- Use Nigerian/West African context where appropriate
- Questions should reflect actual WAEC difficulty and style
- Cover different topics across the subject
- Explanations must be thorough and educational`;

      const apiUrl = `https://apis.prexzyvilla.site/ai/ai4chat?prompt=${encodeURIComponent(prompt)}`;
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error('Failed to fetch questions');

      const contentType = response.headers.get('content-type') || '';
      let text = '';
      if (contentType.includes('application/json')) {
        const json = await response.json();
        text = json.response || json.result || json.content || json.message || JSON.stringify(json);
      } else {
        text = await response.text();
      }

      const match = text.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('Could not parse questions');

      const parsed: WaecQuestion[] = JSON.parse(match[0]);
      const valid = parsed.filter(q =>
        q.question && Array.isArray(q.options) && q.options.length === 4 &&
        typeof q.correct === 'number' && q.correct >= 0 && q.correct <= 3
      );

      if (valid.length < 5) throw new Error('Not enough questions generated');

      setQuestions(valid.slice(0, 15));
      setCurrent(0);
      setSelected(null);
      setAnswered(false);
      setShowExplanation(false);
      setScore(0);
      setCompleted([]);
      setStep('practice');

    } catch (err: any) {
      toast.error(err.message || 'Failed to generate questions');
      setStep('setup');
    }
  };

  const handleAnswer = (idx: number) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    const isCorrect = idx === questions[current].correct;
    if (isCorrect) setScore(s => s + 1);
    setCompleted(prev => [...prev, current]);
  };

  const next = () => {
    if (current + 1 >= questions.length) {
      toast.success(`Quiz done! Score: ${score}/${questions.length}`);
      setStep('setup');
      return;
    }
    setCurrent(c => c + 1);
    setSelected(null);
    setAnswered(false);
    setShowExplanation(false);
  };

  const q = questions[current];
  const subjectLabel = WAEC_SUBJECTS.find(s => s.id === subject)?.label || subject;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#001a33] border border-green-500/30 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-green-500/10">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/40 shrink-0 bg-gradient-to-r from-green-500/10 to-emerald-500/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">WAEC Past Questions</h2>
              {step === 'practice' && q && (
                <p className="text-xs text-green-400/70">{subjectLabel} · Q{current + 1}/{questions.length} · Score: {score}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* Setup */}
          {step === 'setup' && (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-xs font-semibold text-green-400/70 uppercase tracking-widest mb-3">Select Subject</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {WAEC_SUBJECTS.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSubject(s.id)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all hover:scale-[1.01] ${
                        subject === s.id
                          ? 'bg-green-500/20 border-green-500/50 text-green-300'
                          : 'bg-muted/20 border-border/30 text-muted-foreground hover:bg-muted/30'
                      }`}
                    >
                      <span className="text-base">{s.emoji}</span>
                      <span className="text-xs font-medium leading-tight">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-green-400/70 uppercase tracking-widest mb-3">Year Range</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {YEAR_RANGES.map(yr => (
                    <button
                      key={yr}
                      onClick={() => setYearRange(yr)}
                      className={`py-2 rounded-xl border text-xs font-semibold transition-all ${
                        yearRange === yr
                          ? 'bg-green-500/20 border-green-500/50 text-green-300'
                          : 'bg-muted/20 border-border/30 text-muted-foreground hover:bg-muted/30'
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={generateQuestions}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-semibold py-3"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Load 15 WAEC Questions
              </Button>

              <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-green-200/60 leading-relaxed">
                    Questions are AI-generated in authentic WAEC style with West African context. 
                    They reflect real exam patterns and difficulty levels for effective preparation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Loading */}
          {step === 'loading' && (
            <div className="flex items-center justify-center p-16">
              <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 text-green-400 animate-spin mx-auto" />
                <p className="text-white font-medium">Loading WAEC questions...</p>
                <p className="text-sm text-muted-foreground">{subjectLabel} · {yearRange}</p>
              </div>
            </div>
          )}

          {/* Practice */}
          {step === 'practice' && q && (
            <div className="p-6 space-y-4">
              {/* Progress */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
                    style={{ width: `${(completed.length / questions.length) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{completed.length}/{questions.length}</span>
              </div>

              {/* Meta */}
              <div className="flex items-center gap-2 flex-wrap">
                {q.year && (
                  <span className="px-2.5 py-1 bg-green-500/15 border border-green-500/25 text-green-400 text-xs rounded-full font-mono">{q.year}</span>
                )}
                {q.topic && (
                  <span className="px-2.5 py-1 bg-blue-500/15 border border-blue-500/25 text-blue-400 text-xs rounded-full">{q.topic}</span>
                )}
              </div>

              {/* Question */}
              <div className="bg-muted/20 border border-border/30 rounded-xl p-4">
                <p className="text-white leading-relaxed text-sm">{q.question}</p>
              </div>

              {/* Options */}
              <div className="space-y-2">
                {q.options.map((opt, idx) => {
                  let cls = 'bg-muted/20 border-border/30 text-white hover:bg-muted/40 hover:border-white/30';
                  if (answered) {
                    if (idx === q.correct) cls = 'bg-green-500/20 border-green-500/50 text-green-300';
                    else if (idx === selected) cls = 'bg-red-500/20 border-red-500/50 text-red-300';
                    else cls = 'bg-muted/10 border-border/20 text-muted-foreground';
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(idx)}
                      disabled={answered}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${cls}`}
                    >
                      <span className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold shrink-0">
                        {opt.charAt(0)}
                      </span>
                      <span className="text-sm flex-1">{opt.slice(2).trim()}</span>
                      {answered && idx === q.correct && <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />}
                      {answered && idx === selected && idx !== q.correct && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Explanation toggle */}
              {answered && q.explanation && (
                <div>
                  <button
                    onClick={() => setShowExplanation(!showExplanation)}
                    className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {showExplanation ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {showExplanation ? 'Hide' : 'Show'} explanation
                  </button>
                  {showExplanation && (
                    <div className="mt-2 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                      <p className="text-xs font-semibold text-blue-400 mb-1">📖 WAEC Explanation</p>
                      <p className="text-sm text-blue-200/80 leading-relaxed">{q.explanation}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={() => { setStep('setup'); }}
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                {answered && (
                  <Button
                    onClick={next}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500"
                  >
                    {current + 1 >= questions.length ? 'Finish' : 'Next Question'}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
