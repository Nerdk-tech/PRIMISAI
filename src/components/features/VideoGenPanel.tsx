import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Download, Bookmark, Film, Sparkles, Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { FunctionsHttpError } from '@supabase/supabase-js';

export default function VideoGenPanel() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [predictionId, setPredictionId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const generateVideo = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setLoading(true);
    setGeneratedVideo(null);
    setPredictionId(null);
    setProgress(0);

    try {
      const { data: createData, error: createError } = await supabase.functions.invoke('ai-video', {
        body: {
          action: 'create',
          prompt: prompt.trim(),
          model: 'openai/sora-2',
          seconds: 4,
          aspectRatio: 'landscape',
        },
      });

      if (createError) {
        let errorMessage = createError.message;
        if (createError instanceof FunctionsHttpError) {
          try {
            const statusCode = createError.context?.status ?? 500;
            const textContent = await createError.context?.text();
            errorMessage = `[Code: ${statusCode}] ${textContent || createError.message || 'Unknown error'}`;
          } catch {
            errorMessage = `${createError.message || 'Failed to read response'}`;
          }
        }
        throw new Error(errorMessage);
      }

      setPredictionId(createData.id);
      toast.success('Video generation started');

      let videoUploaded = false;
      const checkInterval = setInterval(async () => {
        if (videoUploaded) {
          clearInterval(checkInterval);
          return;
        }

        try {
          const { data: statusData, error: statusError } = await supabase.functions.invoke('ai-video', {
            body: {
              action: 'check',
              predictionId: createData.id,
            },
          });

          if (statusError) throw statusError;

          if (statusData.status === 'succeeded') {
            videoUploaded = true;
            clearInterval(checkInterval);
            setGeneratedVideo(statusData.videoUrl);
            setLoading(false);
            toast.success('Video generated successfully!');
          } else if (statusData.status === 'failed') {
            videoUploaded = true;
            clearInterval(checkInterval);
            setLoading(false);
            toast.error('Video generation failed');
          } else {
            setProgress(statusData.progress || 0);
          }
        } catch (error: any) {
          videoUploaded = true;
          clearInterval(checkInterval);
          setLoading(false);
          console.error('Status check error:', error);
          toast.error('Failed to check video status');
        }
      }, 5000);

    } catch (error: any) {
      console.error('Video generation error:', error);
      toast.error(error.message || 'Failed to generate video');
      setLoading(false);
    }
  };

  const saveVideo = async () => {
    if (!generatedVideo) return;

    try {
      const { error } = await supabase
        .from('saved_content')
        .insert({
          user_id: user!.id,
          type: 'video',
          title: prompt.slice(0, 100),
          content_url: generatedVideo,
          metadata: { prompt },
        });

      if (error) throw error;
      toast.success('Video saved to library');
    } catch (error: any) {
      toast.error('Failed to save video');
    }
  };

  const downloadVideo = async () => {
    if (!generatedVideo) return;

    try {
      const response = await fetch(generatedVideo);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `primis-ai-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Video downloaded');
    } catch (error) {
      toast.error('Failed to download video');
    }
  };

  return (
    <div className="h-full flex relative">
      {/* Under Update Overlay */}
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="relative max-w-2xl mx-auto px-6">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl opacity-20 animate-pulse" />
          
          <div className="relative bg-gradient-to-br from-blue-950/90 via-purple-950/90 to-black/90 backdrop-blur-xl rounded-2xl border-2 border-blue-500/30 shadow-2xl p-8 sm:p-12 text-center space-y-6">
            {/* Sparkle icons */}
            <div className="flex justify-center gap-4 mb-4">
              <Sparkles className="w-8 h-8 text-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <Rocket className="w-10 h-10 text-purple-400 animate-bounce" style={{ animationDelay: '200ms' }} />
              <Sparkles className="w-8 h-8 text-pink-400 animate-bounce" style={{ animationDelay: '400ms' }} />
            </div>

            {/* Main heading with gradient text */}
            <div>
              <h2 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
                🚀 Under Development
              </h2>
              <div className="h-1 w-32 mx-auto bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full" />
            </div>

            {/* Description */}
            <div className="space-y-3">
              <p className="text-xl sm:text-2xl font-semibold text-white">
                Next-Gen AI Video Generation
              </p>
              <p className="text-base sm:text-lg text-gray-300 leading-relaxed">
                We're crafting something <span className="text-transparent bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text font-bold">extraordinary</span>.
                <br />Sora 2, Veo 3.1, and Kling AI models are being integrated for<br className="hidden sm:block" /> cinematic-quality video generation.
              </p>
            </div>

            {/* Features grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
              <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-500/20">
                <Film className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                <p className="text-sm text-blue-200 font-medium">1080p Quality</p>
              </div>
              <div className="bg-purple-900/30 rounded-lg p-4 border border-purple-500/20">
                <Sparkles className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                <p className="text-sm text-purple-200 font-medium">AI Sound Effects</p>
              </div>
              <div className="bg-pink-900/30 rounded-lg p-4 border border-pink-500/20">
                <Rocket className="w-6 h-6 text-pink-400 mx-auto mb-2" />
                <p className="text-sm text-pink-200 font-medium">Lightning Fast</p>
              </div>
            </div>

            {/* Status badge */}
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-400/30 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-gray-200">Active Development • Coming Soon</span>
            </div>

            {/* Shimmer effect */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 animate-shimmer" />
            </div>
          </div>
        </div>
      </div>
      {/* Left Panel - Controls */}
      <div className="w-96 border-r border-border p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Video Generation</h3>
          <p className="text-sm text-muted-foreground">
            Create AI-generated short videos from text descriptions
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Prompt</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the video you want to create..."
              rows={8}
              className="resize-none"
            />
          </div>

          <Button
            onClick={generateVideo}
            disabled={loading || !prompt.trim()}
            className="w-full h-12 bg-primary hover:bg-primary/90"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating {progress > 0 && `(${progress}%)`}
              </>
            ) : (
              <>
                <Film className="w-4 h-4 mr-2" />
                Generate Video
              </>
            )}
          </Button>

          {loading && (
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-2">
                Video generation can take 30-90 seconds
              </p>
              <div className="w-full bg-background rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {generatedVideo && (
          <div className="pt-4 border-t border-border space-y-2">
            <Button
              onClick={downloadVideo}
              variant="outline"
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={saveVideo}
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
      <div className="flex-1 p-3 sm:p-6 flex items-center justify-center bg-gradient-to-br from-background via-muted/10 to-background">
        {loading ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
            </div>
            <p className="text-muted-foreground">Creating your video...</p>
            <p className="text-sm text-muted-foreground">This may take up to 2 minutes</p>
          </div>
        ) : generatedVideo ? (
          <div className="max-w-5xl w-full">
            <video
              src={generatedVideo}
              controls
              className="w-full h-auto max-h-[85vh] rounded-lg shadow-2xl border-2 border-primary/20"
            />
            <p className="text-xs sm:text-sm text-muted-foreground mt-4 text-center px-2">{prompt}</p>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <Film className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              Your generated video will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
