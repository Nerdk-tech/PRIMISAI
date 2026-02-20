import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Image, Video, MessageSquare, Trash2, Download } from 'lucide-react';
import type { SavedContent } from '@/types';
import { toast } from 'sonner';

export default function SavedContentPanel() {
  const { user } = useAuth();
  const [savedContent, setSavedContent] = useState<SavedContent[]>([]);
  const [filter, setFilter] = useState<'all' | 'image' | 'video' | 'chat'>('all');

  useEffect(() => {
    loadSavedContent();
  }, []);

  const loadSavedContent = async () => {
    const { data } = await supabase
      .from('saved_content')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    
    if (data) setSavedContent(data);
  };

  const deleteContent = async (id: string) => {
    const { error } = await supabase
      .from('saved_content')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete content');
    } else {
      toast.success('Content deleted');
      loadSavedContent();
    }
  };

  const downloadContent = async (url: string, type: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `primis-ai-${type}-${Date.now()}.${type === 'image' ? 'png' : 'mp4'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Downloaded successfully');
    } catch (error) {
      toast.error('Failed to download');
    }
  };

  const filteredContent = filter === 'all' 
    ? savedContent 
    : savedContent.filter(c => c.type === filter);

  return (
    <div className="h-full flex flex-col p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Saved Content</h2>
        <p className="text-muted-foreground">Your saved images, videos, and chats</p>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="image">
            <Image className="w-4 h-4 mr-2" />
            Images
          </TabsTrigger>
          <TabsTrigger value="video">
            <Video className="w-4 h-4 mr-2" />
            Videos
          </TabsTrigger>
          <TabsTrigger value="chat">
            <MessageSquare className="w-4 h-4 mr-2" />
            Chats
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex-1 overflow-y-auto">
        {filteredContent.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">No saved content yet</p>
              <p className="text-sm text-muted-foreground">
                Generate images or videos and save them to your library
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContent.map((item) => (
              <div key={item.id} className="bg-card border border-border rounded-lg overflow-hidden">
                {item.type === 'image' && item.content_url && (
                  <img
                    src={item.content_url}
                    alt={item.title || 'Saved image'}
                    className="w-full h-48 object-cover"
                  />
                )}
                
                {item.type === 'video' && item.content_url && (
                  <video
                    src={item.content_url}
                    className="w-full h-48 object-cover"
                    controls
                  />
                )}

                {item.type === 'chat' && (
                  <div className="p-4 bg-muted/20 h-48 flex items-center justify-center">
                    <MessageSquare className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}

                <div className="p-4 space-y-2">
                  <p className="font-medium line-clamp-2">
                    {item.title || 'Untitled'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>
                  
                  <div className="flex gap-2 pt-2">
                    {(item.type === 'image' || item.type === 'video') && item.content_url && (
                      <Button
                        onClick={() => downloadContent(item.content_url!, item.type)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                    )}
                    <Button
                      onClick={() => deleteContent(item.id)}
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
