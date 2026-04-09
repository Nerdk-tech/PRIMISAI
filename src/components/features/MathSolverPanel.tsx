import { useState } from 'react';
import { Calculator, X, Loader2, Send, RotateCcw, Copy, Check, Sigma } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { toast } from 'sonner';

interface Props {
  onClose: () => void;
}

interface SolveResult {
  problem: string;
  solution: string;
}

const EXAMPLE_PROBLEMS = [
  { label: 'Quadratic', text: 'Solve: x² - 5x + 6 = 0' },
  { label: 'Integration', text: 'Find ∫(3x² + 2x - 1)dx' },
  { label: 'Word Problem', text: 'A train travels 300km in 2.5 hours. What is its average speed?' },
  { label: 'Simultaneous', text: 'Solve: 2x + 3y = 12 and x - y = 1' },
  { label: 'Probability', text: 'A bag has 4 red and 6 blue balls. What is P(red)?'},
  { label: 'Trigonometry', text: 'Prove that sin²θ + cos²θ = 1 and explain its geometric meaning' },
];

export default function MathSolverPanel({ onClose }: Props) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SolveResult[]>([]);
  const [copied, setCopied] = useState<number | null>(null);

  const solve = async () => {
    const problem = input.trim();
    if (!problem) return;

    setLoading(true);
    try {
      const prompt = `You are an expert mathematics tutor. Solve the following math problem step by step.

Problem: ${problem}

Instructions:
- Show ALL working steps clearly numbered
- Use LaTeX math notation wrapped in $...$ for inline math or $$...$$ for display math
- Explain each step in plain English
- State the final answer clearly at the end
- If it's a word problem, identify the known values, the unknown, and set up equations first
- Be thorough and educational — this is for students learning`;

      const apiUrl = `https://apis.prexzyvilla.site/ai/ai4chat?prompt=${encodeURIComponent(prompt)}`;
      const res = await fetch(apiUrl);

      if (!res.ok) throw new Error('Failed to solve');

      const contentType = res.headers.get('content-type') || '';
      let solution = '';

      if (contentType.includes('application/json')) {
        const data = await res.json();
        const SKIP = new Set(['status', 'owner', 'version', 'model', 'api', 'code']);
        const KEYS = ['response', 'result', 'reply', 'content', 'message', 'text', 'answer', 'data', 'output'];
        for (const key of KEYS) {
          if (data[key] && typeof data[key] === 'string' && data[key].trim().length > 0) {
            solution = data[key].trim();
            break;
          }
        }
        if (!solution) {
          let longest = '';
          for (const [key, val] of Object.entries(data)) {
            if (!SKIP.has(key.toLowerCase()) && typeof val === 'string' && val.length > longest.length) {
              longest = val;
            }
          }
          solution = longest || JSON.stringify(data);
        }
      } else {
        solution = await res.text();
      }

      if (!solution || solution.trim().length < 5) throw new Error('Empty response from solver');

      setResults(prev => [{ problem, solution }, ...prev]);
      setInput('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to solve. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyResult = async (idx: number, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(idx);
    toast.success('Solution copied!');
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#001a33] border border-blue-500/30 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-blue-500/10">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/40 shrink-0 bg-gradient-to-r from-blue-500/10 to-purple-600/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sigma className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Math Solver</h2>
              <p className="text-xs text-blue-400/70">Step-by-step solutions with KaTeX rendering</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input Area */}
        <div className="p-4 border-b border-border/20 shrink-0 space-y-3">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !loading) { e.preventDefault(); solve(); } }}
              placeholder="Type a math problem... e.g. Solve x² + 5x + 6 = 0"
              rows={2}
              className="flex-1 bg-muted/30 border border-border/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-white placeholder:text-muted-foreground resize-none"
            />
            <Button
              onClick={solve}
              disabled={loading || !input.trim()}
              className="shrink-0 bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white px-4 self-stretch rounded-xl"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </div>

          {/* Example chips */}
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLE_PROBLEMS.map(ex => (
              <button
                key={ex.label}
                onClick={() => setInput(ex.text)}
                className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 hover:border-blue-500/40 text-blue-300 text-xs rounded-full transition-all"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {results.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-600/10 border border-blue-500/20 flex items-center justify-center">
                <Calculator className="w-10 h-10 text-blue-400" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-white font-medium">Enter a math problem above</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Get step-by-step solutions rendered with proper math notation, tables, and explanations
                </p>
              </div>
            </div>
          )}

          {loading && (
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5 flex items-center gap-4">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-300">Solving your problem...</p>
                <p className="text-xs text-muted-foreground mt-0.5">Working out step-by-step solution</p>
              </div>
            </div>
          )}

          {results.map((r, idx) => (
            <div key={idx} className="bg-muted/20 border border-border/30 rounded-xl overflow-hidden">
              {/* Problem */}
              <div className="px-4 py-3 border-b border-border/20 bg-blue-500/5 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-400 shrink-0" />
                <p className="text-sm font-semibold text-blue-300 flex-1">{r.problem}</p>
                <button
                  onClick={() => setResults(prev => prev.filter((_, i) => i !== idx))}
                  className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>

              {/* Solution */}
              <div className="p-4">
                <div className="prose prose-invert max-w-none text-sm
                  prose-p:leading-relaxed prose-p:my-2
                  prose-headings:font-bold prose-headings:text-white
                  prose-strong:text-white
                  prose-li:my-1
                  prose-table:border-collapse prose-table:w-full
                  prose-th:border prose-th:border-white/20 prose-th:px-3 prose-th:py-2 prose-th:text-left
                  prose-td:border prose-td:border-white/10 prose-td:px-3 prose-td:py-2
                  prose-code:text-cyan-300 prose-code:bg-white/10 prose-code:rounded prose-code:px-1">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      table({ children }) {
                        return (
                          <div className="overflow-x-auto my-3 rounded-lg border border-white/10">
                            <table className="w-full border-collapse">{children}</table>
                          </div>
                        );
                      },
                      th({ children }) {
                        return <th className="px-3 py-2 text-left font-semibold text-white bg-white/10 border-r border-white/10 last:border-r-0 text-xs">{children}</th>;
                      },
                      td({ children }) {
                        return <td className="px-3 py-2 border-r border-white/10 last:border-r-0 text-sm text-white/80">{children}</td>;
                      },
                      code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        const codeStr = String(children).replace(/\n$/, '');
                        return !inline && match ? (
                          <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" customStyle={{ borderRadius: '8px', margin: 0 }} {...props}>
                            {codeStr}
                          </SyntaxHighlighter>
                        ) : (
                          <code className={`${className} text-cyan-300 bg-white/10 rounded px-1 py-0.5 text-xs`} {...props}>{children}</code>
                        );
                      },
                    }}
                  >
                    {r.solution}
                  </ReactMarkdown>
                </div>
                <button
                  onClick={() => copyResult(idx, r.solution)}
                  className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-cyan-400 transition-colors"
                >
                  {copied === idx ? (
                    <><Check className="w-3.5 h-3.5 text-green-400" /><span className="text-green-400">Copied!</span></>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" />Copy solution</>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {results.length > 0 && (
          <div className="p-4 border-t border-border/20 shrink-0">
            <button
              onClick={() => setResults([])}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-red-400 transition-colors mx-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear all solutions
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
