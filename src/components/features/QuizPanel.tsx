import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';
import {
  Brain, X, Loader2, CheckCircle2, XCircle,
  ChevronRight, RotateCcw, Trophy, BookOpen, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Props {
  onClose: () => void;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number; // index 0-3
  explanation: string;
}

const SUBJECTS = [
  { id: 'mathematics', label: 'Mathematics', emoji: '📐', color: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/30', text: 'text-blue-300' },
  { id: 'english', label: 'English Language', emoji: '📝', color: 'from-purple-500/20 to-pink-500/20', border: 'border-purple-500/30', text: 'text-purple-300' },
  { id: 'physics', label: 'Physics', emoji: '⚛️', color: 'from-green-500/20 to-emerald-500/20', border: 'border-green-500/30', text: 'text-green-300' },
  { id: 'chemistry', label: 'Chemistry', emoji: '🧪', color: 'from-yellow-500/20 to-amber-500/20', border: 'border-yellow-500/30', text: 'text-yellow-300' },
  { id: 'biology', label: 'Biology', emoji: '🧬', color: 'from-lime-500/20 to-green-500/20', border: 'border-lime-500/30', text: 'text-lime-300' },
  { id: 'economics', label: 'Economics', emoji: '📊', color: 'from-orange-500/20 to-red-500/20', border: 'border-orange-500/30', text: 'text-orange-300' },
  { id: 'government', label: 'Government', emoji: '🏛️', color: 'from-cyan-500/20 to-teal-500/20', border: 'border-cyan-500/30', text: 'text-cyan-300' },
  { id: 'geography', label: 'Geography', emoji: '🌍', color: 'from-teal-500/20 to-cyan-500/20', border: 'border-teal-500/30', text: 'text-teal-300' },
  { id: 'computer_science', label: 'Computer Science', emoji: '💻', color: 'from-indigo-500/20 to-purple-500/20', border: 'border-indigo-500/30', text: 'text-indigo-300' },
];

const DIFFICULTIES = [
  { id: 'easy', label: 'Easy', color: 'text-green-400' },
  { id: 'medium', label: 'Medium', color: 'text-yellow-400' },
  { id: 'hard', label: 'Hard', color: 'text-red-400' },
];

type Step = 'setup' | 'loading' | 'quiz' | 'result';

export default function QuizPanel({ onClose }: Props) {
  const [step, setStep] = useState<Step>('setup');
  const [subject, setSubject] = useState('mathematics');
  const [difficulty, setDifficulty] = useState('medium');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<{ correct: boolean; selected: number }[]>([]);

  const generateQuiz = async () => {
    setStep('loading');

    try {
      const prompt = `Generate exactly 10 multiple choice quiz questions on ${subject.replace('_', ' ')} at ${difficulty} difficulty level.

Return ONLY a valid JSON array (no markdown, no explanation) in this exact format:
[
  {
    "question": "Question text here",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "explanation": "Brief explanation of the correct answer"
  }
]

Rules:
- correct is the 0-based index of the correct option (0, 1, 2, or 3)
- Make questions clear and educational
- Options should be plausible but only one correct
- Explanations should be helpful and concise`;

      const apiUrl = `https://apis.prexzyvilla.site/ai/ai4chat?prompt=${encodeURIComponent(prompt)}`;
      const response = await fetch(apiUrl);

      if (!response.ok) throw new Error('Failed to generate quiz');

      const contentType = response.headers.get('content-type') || '';
      let text = '';
      if (contentType.includes('application/json')) {
        const json = await response.json();
        text = json.response || json.result || json.content || json.message || JSON.stringify(json);
      } else {
        text = await response.text();
      }

      // Extract JSON array from response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('Could not parse quiz questions');

      const parsed: QuizQuestion[] = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Invalid quiz format');

      // Validate structure
      const valid = parsed.filter(q =>
        q.question && Array.isArray(q.options) && q.options.length === 4 &&
        typeof q.correct === 'number' && q.correct >= 0 && q.correct <= 3
      );

      if (valid.length < 5) throw new Error('Not enough valid questions generated');

      setQuestions(valid.slice(0, 10));
      setCurrent(0);
      setSelected(null);
      setAnswered(false);
      setScore(0);
      setAnswers([]);
      setStep('quiz');

    } catch (err: any) {
      toast.error(err.message || 'Failed to generate quiz. Please try again.');
      setStep('setup');
    }
  };

  const handleAnswer = (idx: number) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    const isCorrect = idx === questions[current].correct;
    if (isCorrect) setScore(s => s + 1);
    setAnswers(prev => [...prev, { correct: isCorrect, selected: idx }]);
  };

  const next = () => {
    if (current + 1 >= questions.length) {
      setStep('result');
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setAnswered(false);
    }
  };

  const restart = () => {
    setStep('setup');
    setQuestions([]);
    setCurrent(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setAnswers([]);
  };

  const q = questions[current];
  const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#001a33] border border-primary/30 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-primary/10">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Quiz Mode</h2>
              {step === 'quiz' && (
                <p className="text-xs text-muted-foreground">
                  Question {current + 1} of {questions.length} · Score: {score}
                </p>
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
                <h3 className="text-sm font-semibold text-white/70 uppercase tracking-widest mb-3">Choose Subject</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SUBJECTS.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSubject(s.id)}
                      className={`bg-gradient-to-br ${s.color} border ${subject === s.id ? 'border-white/40 ring-2 ring-white/20' : s.border} rounded-xl p-3 text-left transition-all hover:scale-[1.02]`}
                    >
                      <span className="text-xl">{s.emoji}</span>
                      <p className={`text-sm font-semibold ${s.text} mt-1`}>{s.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white/70 uppercase tracking-widest mb-3">Difficulty</h3>
                <div className="flex gap-3">
                  {DIFFICULTIES.map(d => (
                    <button
                      key={d.id}
                      onClick={() => setDifficulty(d.id)}
                      className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                        difficulty === d.id
                          ? 'bg-white/10 border-white/30 text-white'
                          : 'bg-muted/20 border-border/30 text-muted-foreground hover:bg-muted/40'
                      }`}
                    >
                      <span className={difficulty === d.id ? d.color : ''}>{d.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={generateQuiz}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white font-semibold py-3"
              >
                <Zap className="w-4 h-4 mr-2" />
                Generate 10 Questions
              </Button>
            </div>
          )}

          {/* Loading */}
          {step === 'loading' && (
            <div className="flex-1 flex items-center justify-center p-12">
              <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto" />
                <p className="text-white font-medium">Generating your quiz...</p>
                <p className="text-sm text-muted-foreground">Creating 10 {difficulty} {subject.replace('_', ' ')} questions</p>
              </div>
            </div>
          )}

          {/* Quiz */}
          {step === 'quiz' && q && (
            <div className="p-6 space-y-5">
              {/* Progress bar */}
              <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                  style={{ width: `${((current) / questions.length) * 100}%` }}
                />
              </div>

              {/* Question */}
              <div className="bg-muted/20 border border-border/30 rounded-xl p-4">
                <p className="text-white font-medium leading-relaxed">{q.question}</p>
              </div>

              {/* Options */}
              <div className="space-y-2">
                {q.options.map((opt, idx) => {
                  let style = 'bg-muted/20 border-border/30 text-white hover:bg-muted/40 hover:border-white/30';
                  if (answered) {
                    if (idx === q.correct) {
                      style = 'bg-green-500/20 border-green-500/50 text-green-300';
                    } else if (idx === selected && idx !== q.correct) {
                      style = 'bg-red-500/20 border-red-500/50 text-red-300';
                    } else {
                      style = 'bg-muted/10 border-border/20 text-muted-foreground';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(idx)}
                      disabled={answered}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${style}`}
                    >
                      <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold shrink-0">
                        {['A', 'B', 'C', 'D'][idx]}
                      </span>
                      <span className="text-sm">{opt}</span>
                      {answered && idx === q.correct && <CheckCircle2 className="w-4 h-4 text-green-400 ml-auto shrink-0" />}
                      {answered && idx === selected && idx !== q.correct && <XCircle className="w-4 h-4 text-red-400 ml-auto shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Explanation */}
              {answered && q.explanation && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-400 mb-1">💡 Explanation</p>
                  <p className="text-sm text-blue-200/80">{q.explanation}</p>
                </div>
              )}

              {/* Next */}
              {answered && (
                <Button
                  onClick={next}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500"
                >
                  {current + 1 >= questions.length ? 'See Results' : 'Next Question'}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          )}

          {/* Results */}
          {step === 'result' && (
            <div className="p-6 space-y-6 text-center">
              <div className="space-y-3">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border-2 border-yellow-400/30 flex items-center justify-center mx-auto">
                  <Trophy className="w-12 h-12 text-yellow-400" />
                </div>
                <h3 className="text-2xl font-bold text-white">Quiz Complete!</h3>
                <div className="text-5xl font-bold">
                  <span className={pct >= 70 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400'}>
                    {score}/{questions.length}
                  </span>
                </div>
                <p className="text-muted-foreground">{pct}% score</p>
                <p className={`text-sm font-medium ${pct >= 70 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {pct >= 80 ? 'Excellent! Outstanding performance.' : pct >= 60 ? 'Good job! Keep practicing.' : pct >= 40 ? 'Fair effort. Review the material.' : 'Keep studying! You can improve.'}
                </p>
              </div>

              {/* Answer breakdown */}
              <div className="flex gap-1.5 justify-center flex-wrap">
                {answers.map((a, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      a.correct ? 'bg-green-500/20 border border-green-500/40 text-green-400' : 'bg-red-500/20 border border-red-500/40 text-red-400'
                    }`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button onClick={restart} variant="outline" className="flex-1">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  New Quiz
                </Button>
                <Button onClick={generateQuiz} className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600">
                  <Brain className="w-4 h-4 mr-2" />
                  Retry Same
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
