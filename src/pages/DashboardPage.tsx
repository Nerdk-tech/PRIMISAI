import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Settings, 
  LogOut,
  Shield, 
  MessageSquare, 
  Image, 
  Video, 
  Bookmark,
  Plus,
  Sparkles,
  Mic,
  MicOff,
  Send,
  Menu,
  X,
  Volume2,
  Paperclip,
  Loader2,
  FileDown
} from 'lucide-react';
import type { Chat, Message, Persona } from '@/types';
import ChatMessage from '@/components/features/ChatMessage';
import ExportChatButton from '@/components/features/ExportChatButton';
import { toast } from 'sonner';
import { FunctionsHttpError } from '@supabase/supabase-js';
import SettingsPanel from '@/components/features/SettingsPanel';
import ImageGenPanel from '@/components/features/ImageGenPanel';
import VideoGenPanel from '@/components/features/VideoGenPanel';
import SavedContentPanel from '@/components/features/SavedContentPanel';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'image' | 'video' | 'saved'>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Chat state
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [persona, setPersona] = useState<Persona | null>(null);

  // Voice state
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('alloy');
  const [adminClicks, setAdminClicks] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Vision upload state
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadChats();
    loadUserPersona();
  }, []);

  useEffect(() => {
    if (activeChat) {
      loadMessages(activeChat.id);
    }
  }, [activeChat]);

  useEffect(() => {
    loadUserVoice();
  }, []);

  const loadUserVoice = async () => {
    const { data: settings } = await supabase
      .from('user_settings')
      .select('selected_voice')
      .eq('user_id', user!.id)
      .single();
    
    if (settings?.selected_voice) {
      setSelectedVoice(settings.selected_voice);
    }
  };

  const handleLogoClick = () => {
    setAdminClicks(prev => prev + 1);
    if (adminClicks + 1 === 7) {
      // Check if user is admin
      if (user?.email === 'damibotzinc@gmail.com') {
        navigate('/admin/whatsapp');
        toast.success('Admin panel unlocked');
      }
      setAdminClicks(0);
    }
    setTimeout(() => setAdminClicks(0), 3000);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setUploadingImage(true);

    try {
      // Convert image to base64 for vision analysis
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setUploadedImageUrl(base64String);
        toast.success('Image uploaded - ready for analysis');
        setUploadingImage(false);
      };
      reader.onerror = () => {
        toast.error('Failed to read image');
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
      setUploadingImage(false);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLogoClick = () => {
    setAdminClicks(prev => prev + 1);
    if (adminClicks + 1 === 7) {
      // Check if user is admin
      if (user?.email === 'damibotzinc@gmail.com') {
        navigate('/admin/whatsapp');
        toast.success('Admin panel unlocked');
      }
      setAdminClicks(0);
    }
    setTimeout(() => setAdminClicks(0), 3000);
  };

  const toggleRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error('Microphone access not supported in this browser');
      return;
    }

    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Send to Whisper API for transcription
          try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            const { data, error } = await supabase.functions.invoke('ai-stt', {
              body: formData,
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

            setInput(data.text);
            toast.success('Voice transcribed!');
          } catch (error: any) {
            console.error('STT error:', error);
            toast.error(error.message || 'Failed to transcribe audio');
          } finally {
            stream.getTracks().forEach(track => track.stop());
          }
        };

        mediaRecorder.start();
        setIsRecording(true);
        toast.info('Recording... Click again to stop');
      } catch (error: any) {
        console.error('Microphone error:', error);
        toast.error('Failed to access microphone');
        setIsRecording(false);
      }
    }
  };

  const handleLogoClick = () => {
    setAdminClicks(prev => prev + 1);
    if (adminClicks + 1 === 7) {
      // Check if user is admin
      if (user?.email === 'damibotzinc@gmail.com') {
        navigate('/admin/whatsapp');
        toast.success('Admin panel unlocked');
      }
      setAdminClicks(0);
    }
    setTimeout(() => setAdminClicks(0), 3000);
  };

  const speakMessage = async (text: string) => {
    if (isSpeaking) {
      // Stop current playback
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-tts', {
        body: {
          text,
          voice: selectedVoice,
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

      const audio = new Audio(data.audio);
      currentAudioRef.current = audio;
      
      audio.onended = () => {
        setIsSpeaking(false);
        currentAudioRef.current = null;
      };
      
      audio.onerror = () => {
        setIsSpeaking(false);
        currentAudioRef.current = null;
        toast.error('Failed to play audio');
      };
      
      await audio.play();
    } catch (error: any) {
      console.error('TTS error:', error);
      setIsSpeaking(false);
      toast.error(error.message || 'Failed to generate speech');
    }
  };

  const handleLogoClick = () => {
    setAdminClicks(prev => prev + 1);
    if (adminClicks + 1 === 7) {
      // Check if user is admin
      if (user?.email === 'damibotzinc@gmail.com') {
        navigate('/admin/whatsapp');
        toast.success('Admin panel unlocked');
      }
      setAdminClicks(0);
    }
    setTimeout(() => setAdminClicks(0), 3000);
  };

  const loadUserPersona = async () => {
    const { data: settings } = await supabase
      .from('user_settings')
      .select('selected_persona_id')
      .eq('user_id', user!.id)
      .single();

    if (settings?.selected_persona_id) {
      const { data } = await supabase
        .from('personas')
        .select('*')
        .eq('id', settings.selected_persona_id)
        .single();
      
      if (data) setPersona(data);
    }
  };

  const handleLogoClick = () => {
    setAdminClicks(prev => prev + 1);
    if (adminClicks + 1 === 7) {
      // Check if user is admin
      if (user?.email === 'damibotzinc@gmail.com') {
        navigate('/admin/whatsapp');
        toast.success('Admin panel unlocked');
      }
      setAdminClicks(0);
    }
    setTimeout(() => setAdminClicks(0), 3000);
  };

  const loadChats = async () => {
    const { data } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', user!.id)
      .order('updated_at', { ascending: false });
    
    if (data) setChats(data);
  };

  const loadMessages = async (chatId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    
    if (data) setMessages(data);
  };

  const createNewChat = async () => {
    const { data, error } = await supabase
      .from('chats')
      .insert({
        user_id: user!.id,
        persona_id: persona?.id,
        title: 'New Conversation',
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create chat');
      return;
    }

    setChats([data, ...chats]);
    setActiveChat(data);
    setMessages([]);
    setSidebarOpen(false);
  };

  const sendMessage = async () => {
    if ((!input.trim() && !uploadedImageUrl) || !activeChat) return;

    const userContent = uploadedImageUrl 
      ? `${input.trim()}\n[Image uploaded for analysis]`
      : input.trim();

    const userMessage: Message = {
      id: crypto.randomUUID(),
      chat_id: activeChat.id,
      role: 'user',
      content: userContent,
      attachments: uploadedImageUrl ? [{ type: 'image', url: uploadedImageUrl, name: 'upload' }] : undefined,
      created_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        chat_id: activeChat.id,
        role: 'user',
        content: userMessage.content,
        attachments: userMessage.attachments,
      });

    if (insertError) {
      toast.error('Failed to send message');
      return;
    }

    setMessages([...messages, userMessage]);
    setInput('');
    const imageUrl = uploadedImageUrl;
    setUploadedImageUrl(null);
    setLoading(true);

    try {
      let response;

      if (imageUrl) {
        // Use vision analysis with base64 image
        const { data, error } = await supabase.functions.invoke('ai-vision', {
          body: {
            imageBase64: imageUrl,
            prompt: input.trim() || 'Describe this image in detail',
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

        response = { content: data.description };
      } else {
        // Regular chat
        const conversationHistory = [...messages, userMessage].map(m => ({
          role: m.role,
          content: m.content
        }));

        const { data, error } = await supabase.functions.invoke('ai-chat', {
          body: {
            messages: conversationHistory,
            personaId: persona?.id,
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

        response = data;
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        chat_id: activeChat.id,
        role: 'assistant',
        content: response.content,
        created_at: new Date().toISOString(),
      };

      await supabase
        .from('messages')
        .insert({
          chat_id: activeChat.id,
          role: 'assistant',
          content: assistantMessage.content,
        });

      setMessages(prev => [...prev, assistantMessage]);

      if (messages.length === 0) {
        const title = userContent.slice(0, 50) + (userContent.length > 50 ? '...' : '');
        await supabase
          .from('chats')
          .update({ title })
          .eq('id', activeChat.id);
        
        setChats(chats.map(c => c.id === activeChat.id ? { ...c, title } : c));
      }

    } catch (error: any) {
      console.error('Chat error:', error);
      toast.error(error.message || 'Failed to get response');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoClick = () => {
    setAdminClicks(prev => prev + 1);
    if (adminClicks + 1 === 7) {
      // Check if user is admin
      if (user?.email === 'damibotzinc@gmail.com') {
        navigate('/admin/whatsapp');
        toast.success('Admin panel unlocked');
      }
      setAdminClicks(0);
    }
    setTimeout(() => setAdminClicks(0), 3000);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      logout();
      navigate('/welcome');
    } catch (error: any) {
      toast.error('Failed to logout');
    }
  };

  const handleLogoClick = () => {
    setAdminClicks(prev => prev + 1);
    if (adminClicks + 1 === 7) {
      // Check if user is admin
      if (user?.email === 'damibotzinc@gmail.com') {
        navigate('/admin/whatsapp');
        toast.success('Admin panel unlocked');
      }
      setAdminClicks(0);
    }
    setTimeout(() => setAdminClicks(0), 3000);
  };

  return (
    <div className="h-screen flex bg-gradient-to-br from-[#001a33] via-[#002244] to-[#001133]">
      {/* Hamburger Menu - Mobile */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-lg"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed lg:relative w-64 bg-card/50 border-r border-border flex flex-col z-40 transition-transform duration-300 h-full ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 p-0.5 cursor-pointer"
              onClick={handleLogoClick}
            >
              <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-primary">PRIMIS AI</h1>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          <Button
            onClick={() => { setActiveTab('chat'); setSidebarOpen(false); }}
            variant={activeTab === 'chat' ? 'default' : 'ghost'}
            className="w-full justify-start"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Chat
          </Button>
          <Button
            onClick={() => { setActiveTab('image'); setSidebarOpen(false); }}
            variant={activeTab === 'image' ? 'default' : 'ghost'}
            className="w-full justify-start"
          >
            <Image className="w-4 h-4 mr-2" />
            Image Gen
          </Button>
          <Button
            onClick={() => { setActiveTab('video'); setSidebarOpen(false); }}
            variant={activeTab === 'video' ? 'default' : 'ghost'}
            className="w-full justify-start"
          >
            <Video className="w-4 h-4 mr-2" />
            Video Gen
          </Button>
          <Button
            onClick={() => { setActiveTab('saved'); setSidebarOpen(false); }}
            variant={activeTab === 'saved' ? 'default' : 'ghost'}
            className="w-full justify-start"
          >
            <Bookmark className="w-4 h-4 mr-2" />
            Saved
          </Button>
        </div>

        {activeTab === 'chat' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <Button
              onClick={createNewChat}
              className="w-full mb-4 bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Chat
            </Button>
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => {
                  setActiveChat(chat);
                  setSidebarOpen(false);
                }}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  activeChat?.id === chat.id
                    ? 'bg-primary/20 border border-primary'
                    : 'hover:bg-muted'
                }`}
              >
                <p className="text-sm truncate">{chat.title}</p>
              </button>
            ))}
          </div>
        )}

        <div className="p-4 border-t border-border space-y-2">
          <Button
            onClick={() => setShowSettings(true)}
            variant="ghost"
            className="w-full justify-start"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-destructive hover:text-destructive"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 border-b border-border flex items-center justify-between px-4 lg:px-6 bg-card/30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-base lg:text-lg font-semibold">
                {activeTab === 'chat' && 'AI Chat'}
                {activeTab === 'image' && 'Image Generation'}
                {activeTab === 'video' && 'Video Generation'}
                {activeTab === 'saved' && 'Saved Content'}
              </h2>
              {persona && activeTab === 'chat' && (
                <p className="text-xs text-muted-foreground hidden sm:block">Using: {persona.name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === 'chat' && activeChat && messages.length > 0 && (
              <ExportChatButton messages={messages} chatTitle={activeChat.title} />
            )}
            <Avatar className="w-9 h-9 lg:w-10 lg:h-10 border-2 border-primary cursor-pointer" onClick={() => setShowSettings(true)}>
              <AvatarFallback className="bg-primary text-background text-sm">
                {user?.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Content Area */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
              {messages.length === 0 && !activeChat && (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center space-y-4 px-4">
                    <div className="flex justify-center">
                      <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 p-0.5">
                        <div className="w-full h-full rounded-full bg-[#001a33] flex items-center justify-center">
                          <Sparkles className="w-12 h-12 lg:w-16 lg:h-16 text-primary" />
                        </div>
                      </div>
                    </div>
                    <h3 className="text-xl lg:text-2xl font-semibold text-primary">Welcome to PRIMIS AI</h3>
                    <p className="text-sm lg:text-base text-muted-foreground max-w-md mx-auto">
                      Your intelligent AI assistant. Start a new conversation to begin.
                    </p>
                    <Button onClick={createNewChat} className="bg-primary hover:bg-primary/90">
                      <Plus className="w-4 h-4 mr-2" />
                      Start New Chat
                    </Button>
                  </div>
                </div>
              )}

              {activeChat && messages.length === 0 && (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center space-y-4 px-4">
                    <Sparkles className="w-12 h-12 lg:w-16 lg:h-16 mx-auto text-primary animate-pulse-glow" />
                    <p className="text-sm lg:text-base text-muted-foreground max-w-md mx-auto">
                      Ask me anything. I can help with coding, creative writing, analysis, and more. Upload images for vision analysis!
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-4 max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto px-2 sm:px-0">
                {messages.map((message) => (
                  <div key={message.id} className="group">
                    <ChatMessage message={message} />
                    {message.role === 'assistant' && (
                      <button
                        onClick={() => speakMessage(message.content)}
                        className="ml-11 mt-2 text-xs text-muted-foreground hover:text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {isSpeaking ? (
                          <>
                            <Volume2 className="w-3 h-3 animate-pulse" />
                            Speaking...
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3" />
                            Read aloud
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-primary animate-pulse-glow" />
                    </div>
                    <div className="flex-1 bg-muted/50 rounded-2xl p-4">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Input Area */}
            {activeChat && (
              <div className="border-t border-border p-3 sm:p-4 bg-card/30">
                <div className="max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto space-y-3">
                  {uploadedImageUrl && (
                    <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
                      <img src={uploadedImageUrl} alt="Upload preview" className="w-16 h-16 rounded object-cover" />
                      <p className="text-sm text-muted-foreground flex-1">Image ready for analysis</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUploadedImageUrl(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={`shrink-0 ${isRecording ? 'text-red-500' : ''}`}
                      onClick={toggleRecording}
                      disabled={loading}
                    >
                      {isRecording ? <MicOff className="w-5 h-5 animate-pulse" /> : <Mic className="w-5 h-5" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="shrink-0"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading || uploadingImage}
                    >
                      {uploadingImage ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Paperclip className="w-5 h-5" />
                      )}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      placeholder={uploadedImageUrl ? 'Ask about the image...' : isRecording ? 'Listening...' : 'Type your message...'}
                      disabled={loading}
                      className="flex-1 bg-muted border border-border rounded-full px-4 lg:px-6 py-2 lg:py-3 text-sm lg:text-base focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <Button 
                      onClick={sendMessage}
                      disabled={loading || (!input.trim() && !uploadedImageUrl)}
                      className="shrink-0 rounded-full w-10 h-10 lg:w-12 lg:h-12 p-0 bg-primary hover:bg-primary/90"
                    >
                      <Send className="w-4 h-4 lg:w-5 lg:h-5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'image' && <ImageGenPanel />}
        {activeTab === 'video' && <VideoGenPanel />}
        {activeTab === 'saved' && <SavedContentPanel />}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          onPersonaChange={loadUserPersona}
        />
      )}
    </div>
  );
}
