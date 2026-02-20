import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText, Loader2 } from 'lucide-react';
import type { Message } from '@/types';
import { toast } from 'sonner';

interface ExportChatButtonProps {
  messages: Message[];
  chatTitle: string;
}

export default function ExportChatButton({ messages, chatTitle }: ExportChatButtonProps) {
  const [exporting, setExporting] = useState(false);

  const exportAsText = () => {
    if (messages.length === 0) {
      toast.error('No messages to export');
      return;
    }

    setExporting(true);

    try {
      let content = `PRIMIS AI - Chat Export\n`;
      content += `Chat: ${chatTitle}\n`;
      content += `Exported: ${new Date().toLocaleString()}\n`;
      content += `\n${'='.repeat(60)}\n\n`;

      messages.forEach((msg) => {
        const role = msg.role === 'user' ? 'You' : 'PRIMIS AI';
        const timestamp = new Date(msg.created_at).toLocaleString();
        
        content += `[${timestamp}] ${role}:\n`;
        content += `${msg.content}\n\n`;
        content += `${'-'.repeat(60)}\n\n`;
      });

      const blob = new Blob([content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `primis-ai-chat-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Chat exported successfully');
    } catch (error) {
      toast.error('Failed to export chat');
    } finally {
      setExporting(false);
    }
  };

  const exportAsMarkdown = () => {
    if (messages.length === 0) {
      toast.error('No messages to export');
      return;
    }

    setExporting(true);

    try {
      let content = `# PRIMIS AI - Chat Export\n\n`;
      content += `**Chat:** ${chatTitle}\n\n`;
      content += `**Exported:** ${new Date().toLocaleString()}\n\n`;
      content += `---\n\n`;

      messages.forEach((msg) => {
        const role = msg.role === 'user' ? '👤 **You**' : '🤖 **PRIMIS AI**';
        const timestamp = new Date(msg.created_at).toLocaleString();
        
        content += `### ${role} - *${timestamp}*\n\n`;
        content += `${msg.content}\n\n`;
        content += `---\n\n`;
      });

      const blob = new Blob([content], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `primis-ai-chat-${Date.now()}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Chat exported as Markdown');
    } catch (error) {
      toast.error('Failed to export chat');
    } finally {
      setExporting(false);
    }
  };

  if (messages.length === 0) return null;

  return (
    <div className="flex gap-2">
      <Button
        onClick={exportAsText}
        disabled={exporting}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        {exporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileText className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">Export as Text</span>
        <span className="sm:hidden">Text</span>
      </Button>
      
      <Button
        onClick={exportAsMarkdown}
        disabled={exporting}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        {exporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">Export as Markdown</span>
        <span className="sm:hidden">MD</span>
      </Button>
    </div>
  );
}
