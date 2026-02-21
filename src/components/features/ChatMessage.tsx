import { useState } from 'react';
import type { Message } from '@/types';
import { User, Sparkles, Copy, Check, Maximize2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { toast } from 'sonner';

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Code copied to clipboard!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
      )}
      
      <div
        className={`max-w-[70%] rounded-2xl p-4 ${
          isUser
            ? 'bg-primary text-background'
            : 'bg-muted/50'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeString = String(children).replace(/\n$/, '');
                  
                  return !inline && match ? (
                    <div className="relative group">
                      <button
                        onClick={() => copyCode(codeString)}
                        className="absolute top-2 right-2 p-2 bg-background/80 hover:bg-background rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        {copiedCode === codeString ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {codeString}
                      </SyntaxHighlighter>
                    </div>
                  ) : (
                    <code className={className} {...props}>
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

        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.attachments.map((att, idx) => (
              <div key={idx}>
                {att.type === 'image' && (
                  <div className="relative group">
                    <img 
                      src={att.url} 
                      alt={att.name} 
                      className="max-w-[200px] rounded-lg cursor-pointer hover:opacity-80 transition-opacity" 
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
            className="max-w-full max-h-full rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setExpandedImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 text-sm"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
