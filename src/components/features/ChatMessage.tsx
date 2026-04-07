import { useState } from 'react';
import type { Message } from '@/types';
import { User, Sparkles, Copy, Check, Maximize2, BookmarkPlus, BookmarkCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { toast } from 'sonner';

interface ChatMessageProps {
  message: Message;
  onSaveNote?: (content: string) => void;
}

export default function ChatMessage({ message, onSaveNote }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [noteSaved, setNoteSaved] = useState(false);

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Code copied to clipboard!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleSaveNote = () => {
    if (onSaveNote) {
      onSaveNote(message.content);
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 3000);
    }
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
      )}

      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 ${
          isUser
            ? 'bg-primary text-background'
            : 'bg-muted/50'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        ) : (
          <div className="prose prose-invert max-w-none text-sm
            prose-table:border-collapse prose-table:w-full prose-table:my-4
            prose-thead:bg-muted/70
            prose-th:border prose-th:border-white/20 prose-th:px-4 prose-th:py-2.5 prose-th:text-left prose-th:font-semibold prose-th:text-sm
            prose-td:border prose-td:border-white/10 prose-td:px-4 prose-td:py-2 prose-td:text-sm
            prose-tr:border-b prose-tr:border-white/10
            prose-tr:hover:bg-white/5
            prose-p:leading-relaxed prose-p:my-2
            prose-li:my-0.5
            prose-headings:font-bold
            prose-strong:text-white
            prose-code:text-cyan-300 prose-code:bg-white/10 prose-code:rounded prose-code:px-1">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                table({ children }) {
                  return (
                    <div className="overflow-x-auto my-4 rounded-lg border border-white/10">
                      <table className="w-full border-collapse">
                        {children}
                      </table>
                    </div>
                  );
                },
                thead({ children }) {
                  return <thead className="bg-white/10">{children}</thead>;
                },
                tr({ children }) {
                  return <tr className="border-b border-white/10 hover:bg-white/5 transition-colors">{children}</tr>;
                },
                th({ children }) {
                  return <th className="px-4 py-2.5 text-left font-semibold text-white border-r border-white/10 last:border-r-0 text-sm">{children}</th>;
                },
                td({ children }) {
                  return <td className="px-4 py-2 border-r border-white/10 last:border-r-0 text-sm text-white/80">{children}</td>;
                },
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeString = String(children).replace(/\n$/, '');

                  return !inline && match ? (
                    <div className="relative group my-3">
                      <button
                        onClick={() => copyCode(codeString)}
                        className="absolute top-2 right-2 p-1.5 bg-background/80 hover:bg-background rounded-md sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-opacity z-10"
                        title="Copy code"
                      >
                        {copiedCode === codeString ? (
                          <Check className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{ borderRadius: '8px', margin: 0 }}
                        {...props}
                      >
                        {codeString}
                      </SyntaxHighlighter>
                    </div>
                  ) : (
                    <code className={`${className} text-cyan-300 bg-white/10 rounded px-1 py-0.5 text-xs`} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.attachments.map((att, idx) => (
              <div key={idx}>
                {att.type === 'image' && (
                  <div className="relative group">
                    <img
                      src={att.url}
                      alt={att.name}
                      className={`rounded-lg cursor-pointer hover:opacity-90 transition-all hover:shadow-xl ${
                        att.name === 'generated'
                          ? 'max-w-full sm:max-w-sm border-2 border-primary/30'
                          : 'max-w-[180px]'
                      }`}
                      onClick={() => setExpandedImage(att.url)}
                    />
                    <button
                      onClick={() => setExpandedImage(att.url)}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Maximize2 className="w-3 h-3 text-white" />
                    </button>
                  </div>
                )}
                {att.type === 'video' && (
                  <video src={att.url} controls className="max-w-sm rounded-lg" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Note Save button for assistant messages */}
        {!isUser && onSaveNote && (
          <button
            onClick={handleSaveNote}
            className="flex items-center gap-1 mt-3 text-xs text-muted-foreground hover:text-cyan-400 transition-colors"
          >
            {noteSaved ? (
              <>
                <BookmarkCheck className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-400">Note saved!</span>
              </>
            ) : (
              <>
                <BookmarkPlus className="w-3.5 h-3.5" />
                Save as note
              </>
            )}
          </button>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-background" />
        </div>
      )}

      {/* Image Expansion Modal */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setExpandedImage(null)}
        >
          <img
            src={expandedImage}
            alt="Expanded view"
            className="max-w-full max-h-full rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setExpandedImage(null)}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
