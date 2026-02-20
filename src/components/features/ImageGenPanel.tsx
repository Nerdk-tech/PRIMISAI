import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Download, Bookmark, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { FunctionsHttpError } from '@supabase/supabase-js';

export default function ImageGenPanel() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const aspectRatios = [
    { label: 'Square (1:1)', value: '1:1' },
    { label: 'Landscape (16:9)', value: '16:9' },
    { label: 'Portrait (9:16)', value: '9:16' },
    { label: '4:3', value: '4:3' },
    { label: '3:4', value: '3:4' },
  ];

  const generateImage = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setLoading(true);
    setGeneratedImage(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-image', {
        body: {
          prompt: prompt.trim(),
          aspectRatio,
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

      setGeneratedImage(data.imageUrl);
      toast.success('Image generated successfully!');
    } catch (error: any) {
      console.error('Image generation error:', error);
      toast.error(error.message || 'Failed to generate image');
    } finally {
      setLoading(false);
    }
  };

  const saveImage = async () => {
    if (!generatedImage) return;

    try {
      const { error } = await supabase
        .from('saved_content')
        .insert({
          user_id: user!.id,
          type: 'image',
          title: prompt.slice(0, 100),
          content_url: generatedImage,
          metadata: { prompt, aspectRatio },
        });

      if (error) throw error;
      toast.success('Image saved to library');
    } catch (error: any) {
      toast.error('Failed to save image');
    }
  };

  const downloadImage = async () => {
    if (!generatedImage) return;

    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `primis-ai-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Image downloaded');
    } catch (error) {
      toast.error('Failed to download image');
    }
  };

  return (
    <div className="h-full flex">
      {/* Left Panel - Controls */}
      <div className="w-96 border-r border-border p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Image Generation</h3>
          <p className="text-sm text-muted-foreground">
            Create stunning AI-generated images from text descriptions
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Prompt</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to create..."
              rows={6}
              className="resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Aspect Ratio</label>
            <div className="grid grid-cols-2 gap-2">
              {aspectRatios.map((ratio) => (
                <button
                  key={ratio.value}
                  onClick={() => setAspectRatio(ratio.value)}
                  className={`px-3 py-2 rounded-lg border-2 text-sm transition-all ${
                    aspectRatio === ratio.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {ratio.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={generateImage}
            disabled={loading || !prompt.trim()}
            className="w-full h-12 bg-primary hover:bg-primary/90"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Generate Image
              </>
            )}
          </Button>
        </div>

        {generatedImage && (
          <div className="pt-4 border-t border-border space-y-2">
            <Button
              onClick={downloadImage}
              variant="outline"
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={saveImage}
              variant="outline"
              className="w-full"
            >
              <Bookmark className="w-4 h-4 mr-2" />
              Save to Library
            </Button>
          </div>
        )}
      </div>

      {/* Right Panel - Preview */}
      <div className="flex-1 p-3 sm:p-6 flex items-center justify-center bg-gradient-to-br from-background via-muted/10 to-background overflow-auto">
        {loading ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
            </div>
            <p className="text-muted-foreground">Creating your image...</p>
          </div>
        ) : generatedImage ? (
          <div className="w-full max-w-7xl">
            <img
              src={generatedImage}
              alt="Generated"
              className="w-full h-auto max-h-[85vh] object-contain rounded-lg shadow-2xl border-2 border-primary/20"
            />
            <p className="text-xs sm:text-sm text-muted-foreground mt-4 text-center px-2">{prompt}</p>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <Wand2 className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              Your generated image will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
