import { useState, useEffect, useRef } from 'react';
import {
  Monitor, X, Loader2, CheckCircle2, XCircle, ChevronRight,
  ChevronLeft, Clock, Trophy, RotateCcw, AlertTriangle, Flag,
  Bookmark, BookmarkCheck, BarChart2, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Props {
  onClose: () => void;
}

interface CBTQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  topic: string;
}

const CBT_SUBJECTS = [
  { id: 'mathematics', label: 'Mathematics', emoji: '📐', color: 'blue' },
  { id: 'english_language', label: 'English Language', emoji: '📝', color: 'purple' },
  { id: 'physics', label: 'Physics', emoji: '⚛️', color: 'green' },
  { id: 'chemistry', label: 'Chemistry', emoji: '🧪', color: 'yellow' },
  { id: 'biology', label: 'Biology', emoji: '🧬', color: 'lime' },
  { id: 'economics', label: 'Economics', emoji: '📊', color: 'orange' },
  { id: 'government', label: 'Government', emoji: '🏛️', color: 'cyan' },
  { id: 'geography', label: 'Geography', emoji: '🌍', color: 'teal' },
  { id: 'computer_science', label: 'Computer Science', emoji: '💻', color: 'indigo' },
  { id: 'commerce', label: 'Commerce', emoji: '💼', color: 'rose' },
  { id: 'literature', label: 'Literature', emoji: '📚', color: 'amber' },
  { id: 'further_mathematics', label: 'Further Maths', emoji: '∞', color: 'violet' },
];

const EXAM_TYPES = [
  { id: 'waec', label: 'WAEC', desc: 'West African Examinations' },
  { id: 'jamb', label: 'JAMB/UTME', desc: 'Joint Admission' },
  { id: 'neco', label: 'NECO', desc: 'National Exams Council' },
  { id: 'post_utme', label: 'Post-UTME', desc: 'University screening' },
];

const DURATIONS = [
  { mins: 15, label: '15 min', questions: 10 },
  { mins: 30, label: '30 min', questions: 20 },
  { mins: 60, label: '1 hour', questions: 40 },
  { mins: 120, label: '2 hours', questions: 60 },
];

type Step = 'setup' | 'loading' | 'exam' | 'review' | 'result';

export default function CBTPanel({ onClose }: Props) {
  const [step, setStep] = useState<Step>('setup');
  const [subject, setSubject] = useState('mathematics');
  const [examType, setExamType] = useState('waec');
  const [durationConfig, setDurationConfig] = useState(DURATIONS[1]);

  const [questions, setQuestions] = useState<CBTQuestion[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [flagged, setFlagged] = useState<boolean[]>([]);
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer countdown
  useEffect(() => {
    if (step !== 'exam' || submitted) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step, submitted]);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const generateExam = async () => {
    setStep('loading');
    try {
      const subjectLabel = CBT_SUBJECTS.find(s => s.id === subject)?.label || subject;
      const examLabel = EXAM_TYPES.find(e => e.id === examType)?.label || examType;
      const numQ = durationConfig.questions;

      const prompt = `Generate exactly ${numQ} multiple choice CBT exam questions for ${examLabel} ${subjectLabel}.

These should be authentic Nigerian exam-style questions at appropriate difficulty level.

Return ONLY a valid JSON array (no markdown, no explanation) like this:
[
  {
    "topic": "Topic name",
    "question": "Full question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "explanation": "Brief explanation of the correct answer and why others are wrong"
  }
]

Rules:
- correct is 0-based index (0=A, 1=B, 2=C, 3=D)
- Use Nigerian curriculum and context
- Vary difficulty: 40% easy, 40% medium, 20% hard
- Cover different topics within ${subjectLabel}
- All options should be plausible`;

      const apiUrl = `https://apis.prexzyvilla.site/ai/ai4chat?prompt=${encodeURIComponent(prompt)}`;
      const response = await fetch(apiUrl, { signal: AbortSignal.timeout(60000) });
      if (!response.ok) throw new Error('Failed to generate exam');

      const contentType = response.headers.get('content-type') || '';
      let text = '';
      if (contentType.includes('application/json')) {
        const json = await response.json();
        const KEYS = ['response', 'result', 'reply', 'content', 'message', 'text', 'answer', 'data', 'output'];
        for (const key of KEYS) {
          if (json[key] && typeof json[key] === 'string') { text = json[key]; break; }
        }
        if (!text) text = JSON.stringify(json);
      } else {
        text = await response.text();
      }

      const match = text.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('Could not parse exam questions');

      const parsed: CBTQuestion[] = JSON.parse(match[0]);
      const valid = parsed.filter(q =>
        q.question && Array.isArray(q.options) && q.options.length === 4 &&
        typeof q.correct === 'number' && q.correct >= 0 && q.correct <= 3
      );

      if (valid.length < 5) throw new Error('Not enough questions generated. Please try again.');

      const finalQuestions = valid.slice(0, numQ);
      setQuestions(finalQuestions);
      setAnswers(new Array(finalQuestions.length).fill(null));
      setFlagged(new Array(finalQuestions.length).fill(false));
      setCurrent(0);
      setTimeLeft(durationConfig.mins * 60);
      setSubmitted(false);
      setReviewMode(false);
      setShowSummary(false);
      setStep('exam');

    } catch (err: any) {
      toast.error(err.message || 'Failed to generate exam');
      setStep('setup');
    }
  };

  const selectAnswer = (idx: number) => {
    if (submitted) return;
    setAnswers(prev => {
      const next = [...prev];
      next[current] = idx;
      return next;
    });
  };

  const toggleFlag = () => {
    setFlagged(prev => {
      const next = [...prev];
      next[current] = !next[current];
      return next;
    });
  };

  const handleSubmit = (autoSubmit = false) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const unanswered = answers.filter(a => a === null).length;
    if (!autoSubmit && unanswered > 0) {
      toast.warning(`You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Submitting anyway.`);
    }
    if (autoSubmit) toast.error("Time's up! Exam submitted automatically.");
    setSubmitted(true);
    setStep('result');
  };

  // Scoring
  const score = questions.reduce((acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0), 0);
  const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  const answered = answers.filter(a => a !== null).length;
  const flaggedCount = flagged.filter(Boolean).length;

  const q = questions[current];

  const getGrade = (p: number) => {
    if (p >= 75) return { grade: 'A', label: 'Excellent!', color: 'text-green-400' };
    if (p >= 60) return { grade: 'B', label: 'Good Job!', color: 'text-blue-400' };
    if (p >= 50) return { grade: 'C', label: 'Pass', color: 'text-yellow-400' };
    if (p >= 40) return { grade: 'D', label: 'Borderline', color: 'text-orange-400' };
    return { grade: 'F', label: 'Failed', color: 'text-red-400' };
  };

  const gradeInfo = getGrade(pct);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-[#001220] border border-cyan-500/30 rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl shadow-cyan-500/10">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 shrink-0 bg-gradient-to-r from-cyan-500/10 to-blue-600/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Monitor className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">CBT Exam Mode</h2>
              {step === 'exam' && (
                <p className="text-xs text-cyan-400/70">
                  {CBT_SUBJECTS.find(s => s.id === subject)?.label} · {EXAM_TYPES.find(e => e.id === examType)?.label}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Timer */}
            {step === 'exam' && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono text-sm font-bold ${
                timeLeft < 300
                  ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse'
                  : 'bg-muted/30 border-border/40 text-white'
              }`}>
                <Clock className="w-4 h-4" />
                {formatTime(timeLeft)}
              </div>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SETUP */}
        {step === 'setup' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
              <h3 className="text-xs font-semibold text-cyan-400/70 uppercase tracking-widest mb-3">Exam Type</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {EXAM_TYPES.map(e => (
                  <button
                    key={e.id}
                    onClick={() => setExamType(e.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      examType === e.id
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-white'
                        : 'bg-muted/20 border-border/30 text-muted-foreground hover:bg-muted/30'
                    }`}
                  >
                    <p className={`text-sm font-bold ${examType === e.id ? 'text-cyan-300' : ''}`}>{e.label}</p>
                    <p className="text-xs opacity-60 mt-0.5">{e.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-cyan-400/70 uppercase tracking-widest mb-3">Subject</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CBT_SUBJECTS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSubject(s.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
                      subject === s.id
                        ? 'bg-cyan-500/20 border-cyan-500/50'
                        : 'bg-muted/20 border-border/30 hover:bg-muted/30'
                    }`}
                  >
                    <span>{s.emoji}</span>
                    <span className={`text-xs font-medium ${subject === s.id ? 'text-cyan-300' : 'text-muted-foreground'}`}>
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-cyan-400/70 uppercase tracking-widest mb-3">Duration & Questions</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DURATIONS.map(d => (
                  <button
                    key={d.mins}
                    onClick={() => setDurationConfig(d)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      durationConfig.mins === d.mins
                        ? 'bg-cyan-500/20 border-cyan-500/50'
                        : 'bg-muted/20 border-border/30 hover:bg-muted/30'
                    }`}
                  >
                    <p className={`text-sm font-bold ${durationConfig.mins === d.mins ? 'text-cyan-300' : 'text-white'}`}>{d.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{d.questions} questions</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
              <div className="text-xs text-cyan-200/60 space-y-1">
                <p>• Timer starts immediately when the exam begins</p>
                <p>• You can flag questions and return to them later</p>
                <p>• Navigate freely between questions using the grid</p>
                <p>• Exam auto-submits when time runs out</p>
              </div>
            </div>

            <Button
              onClick={generateExam}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold py-3 text-base"
            >
              <Zap className="w-4 h-4 mr-2" />
              Start CBT Exam
            </Button>
          </div>
        )}

        {/* LOADING */}
        {step === 'loading' && (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center space-y-4">
              <div className="relative w-20 h-20 mx-auto">
                <div className="w-20 h-20 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Monitor className="w-8 h-8 text-cyan-400" />
                </div>
              </div>
              <div>
                <p className="text-white font-semibold text-lg">Preparing your exam...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Generating {durationConfig.questions} {EXAM_TYPES.find(e => e.id === examType)?.label} {CBT_SUBJECTS.find(s => s.id === subject)?.label} questions
                </p>
                <p className="text-xs text-cyan-400/50 mt-2">This may take 15–30 seconds</p>
              </div>
            </div>
          </div>
        )}

        {/* EXAM */}
        {step === 'exam' && q && (
          <div className="flex-1 flex overflow-hidden">
            {/* Question panel */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Progress bar */}
              <div className="px-5 py-2 border-b border-border/20 bg-black/20 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                      style={{ width: `${(answered / questions.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{answered}/{questions.length} answered</span>
                </div>
              </div>

              {/* Question content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Q header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded-full font-mono font-bold">
                        Q{current + 1}
                      </span>
                      {q.topic && (
                        <span className="px-2 py-0.5 bg-blue-500/15 text-blue-400 text-xs rounded-full">{q.topic}</span>
                      )}
                    </div>
                    <p className="text-white text-base leading-relaxed font-medium">{q.question}</p>
                  </div>
                  <button
                    onClick={toggleFlag}
                    className={`p-2 rounded-lg transition-all shrink-0 mt-1 ${
                      flagged[current]
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : 'bg-muted/30 text-muted-foreground hover:bg-amber-500/10 hover:text-amber-400'
                    }`}
                    title="Flag for review"
                  >
                    {flagged[current] ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  </button>
                </div>

                {/* Options */}
                <div className="space-y-2">
                  {q.options.map((opt, idx) => {
                    const isSelected = answers[current] === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => selectAnswer(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-500/60 text-white ring-1 ring-cyan-500/40'
                            : 'bg-muted/20 border-border/30 text-white/80 hover:bg-muted/40 hover:border-white/30'
                        }`}
                      >
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                          isSelected ? 'bg-cyan-500 text-white' : 'bg-white/10'
                        }`}>
                          {['A', 'B', 'C', 'D'][idx]}
                        </span>
                        <span className="text-sm">{opt}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400 ml-auto shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Navigation */}
              <div className="px-5 py-3 border-t border-border/20 bg-black/20 shrink-0 flex items-center gap-3">
                <Button
                  onClick={() => setCurrent(c => Math.max(0, c - 1))}
                  disabled={current === 0}
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Prev
                </Button>

                <Button
                  onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))}
                  disabled={current === questions.length - 1}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>

                <Button
                  onClick={() => handleSubmit()}
                  className="shrink-0 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm"
                >
                  <Flag className="w-3.5 h-3.5 mr-1.5" />
                  Submit
                </Button>
              </div>
            </div>

            {/* Question grid sidebar */}
            <div className="w-52 border-l border-border/20 bg-black/20 flex flex-col shrink-0 hidden sm:flex">
              <div className="p-3 border-b border-border/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Question Grid</p>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <div className="grid grid-cols-5 gap-1.5">
                  {questions.map((_, idx) => {
                    const isAnswered = answers[idx] !== null;
                    const isFlagged = flagged[idx];
                    const isCurrent = idx === current;
                    return (
                      <button
                        key={idx}
                        onClick={() => setCurrent(idx)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all relative ${
                          isCurrent
                            ? 'ring-2 ring-cyan-500 bg-cyan-500/20 text-cyan-300'
                            : isAnswered
                              ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/30'
                              : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                        }`}
                      >
                        {idx + 1}
                        {isFlagged && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="p-3 border-t border-border/20 space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-cyan-500/30 border border-cyan-500/30" />
                  <span>Answered ({answered})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-muted/30" />
                  <span>Unanswered ({questions.length - answered})</span>
                </div>
                {flaggedCount > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-amber-400/30 border border-amber-400/30" />
                    <span>Flagged ({flaggedCount})</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* RESULT */}
        {step === 'result' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Score card */}
            <div className="text-center space-y-3">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border-4 border-cyan-500/30 flex flex-col items-center justify-center mx-auto">
                <span className={`text-3xl font-black ${gradeInfo.color}`}>{gradeInfo.grade}</span>
                <span className="text-xs text-muted-foreground">{pct}%</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">{gradeInfo.label}</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {score} out of {questions.length} correct
                </p>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Correct', value: score, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
                { label: 'Wrong', value: questions.length - score - answers.filter(a => a === null).length, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
                { label: 'Skipped', value: answers.filter(a => a === null).length, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
              ].map(stat => (
                <div key={stat.label} className={`${stat.bg} border rounded-xl p-3 text-center`}>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Review toggles */}
            <div className="flex gap-3">
              <Button
                onClick={() => { setReviewMode(true); setCurrent(0); setStep('exam'); }}
                variant="outline"
                className="flex-1 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
              >
                <BarChart2 className="w-4 h-4 mr-2" />
                Review Answers
              </Button>
              <Button
                onClick={() => setStep('setup')}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                New Exam
              </Button>
            </div>

            {/* Answer breakdown */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Answer Breakdown</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {questions.map((q, i) => {
                  const userAns = answers[i];
                  const isCorrect = userAns === q.correct;
                  const isSkipped = userAns === null;
                  return (
                    <div
                      key={i}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${
                        isSkipped
                          ? 'bg-yellow-500/5 border-yellow-500/20'
                          : isCorrect
                            ? 'bg-green-500/5 border-green-500/20'
                            : 'bg-red-500/5 border-red-500/20'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        isSkipped ? 'bg-yellow-500/20' : isCorrect ? 'bg-green-500/20' : 'bg-red-500/20'
                      }`}>
                        {isSkipped ? (
                          <span className="text-xs text-yellow-400 font-bold">?</span>
                        ) : isCorrect ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/80 text-xs leading-snug line-clamp-2">{q.question}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {!isSkipped && !isCorrect && (
                            <span className="text-xs text-red-400">
                              Your: {q.options[userAns!]?.slice(0, 30)}
                            </span>
                          )}
                          <span className="text-xs text-green-400">
                            Correct: {q.options[q.correct]?.slice(0, 30)}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground shrink-0">Q{i + 1}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
