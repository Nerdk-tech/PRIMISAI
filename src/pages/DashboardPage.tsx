import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Settings, 
  LogOut, 
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
  Shield
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
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState('alloy');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Vision upload state
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Image generation state
  const [generatingImage, setGeneratingImage] = useState(false);

  // Check if user is admin
  const isAdmin = user?.email === 'damibotzinc@gmail.com';

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

  const toggleRecording = async () => {
    // Check if browser supports Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast.error('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current) {
        (mediaRecorderRef.current as any).stop();
        mediaRecorderRef.current = null;
      }
      setIsRecording(false);
    } else {
      // Start browser-based speech recognition (FREE - no API needed!)
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let finalTranscript = '';
        let interimTranscript = '';

        recognition.onstart = () => {
          setIsRecording(true);
          toast.info('🎤 Listening... Click mic again to stop');
        };

        recognition.onresult = (event: any) => {
          interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }
          // Update input with both final and interim results
          setInput(finalTranscript + interimTranscript);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
          if (event.error === 'no-speech') {
            toast.error('No speech detected. Please try again.');
          } else if (event.error === 'network') {
            toast.error('Network error. Please check your connection.');
          } else {
            toast.error(`Speech recognition error: ${event.error}`);
          }
        };

        recognition.onend = () => {
          setIsRecording(false);
          if (finalTranscript || interimTranscript) {
            toast.success('✅ Voice transcribed!');
          }
        };

        recognition.start();
        mediaRecorderRef.current = recognition as any;
        
      } catch (error: any) {
        console.error('Speech recognition error:', error);
        toast.error('Failed to start speech recognition');
        setIsRecording(false);
      }
    }
  };

  const speakMessage = async (messageId: string, text: string) => {
    // If this message is already speaking, stop it
    if (speakingMessageId === messageId) {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current = null;
      }
      setSpeakingMessageId(null);
      return;
    }

    // Stop any other message that's currently playing
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }

    setSpeakingMessageId(messageId);

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
        setSpeakingMessageId(null);
        currentAudioRef.current = null;
      };
      
      audio.onerror = () => {
        setSpeakingMessageId(null);
        currentAudioRef.current = null;
        toast.error('Failed to play audio');
      };
      
      await audio.play();
    } catch (error: any) {
      console.error('TTS error:', error);
      setSpeakingMessageId(null);
      toast.error(error.message || 'Failed to generate speech');
    }
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
      
      // More precise image generation detection - only trigger on explicit requests
      const lowerInput = input.toLowerCase().trim();
      const explicitImagePatterns = [
        /^(generate|create|make|draw|design|produce|paint|illustrate|render)\s+(an?\s+)?(image|picture|photo|art|illustration|graphic|artwork|drawing|painting)/i,
        /^(can you|could you|please|pls)\s+(generate|create|make|draw|design|produce|paint|illustrate|render)\s+(an?\s+)?(image|picture|photo|art)/i,
        /^(show me|give me|i want|i need)\s+(an?\s+)?(image|picture|photo|art)/i,
      ];
      const isImageGenRequest = !imageUrl && explicitImagePatterns.some(pattern => pattern.test(lowerInput));

      if (isImageGenRequest) {
        // Smart prompt extraction - remove trigger words and extract the actual subject
        let imagePrompt = input.trim();
        
        // Remove common trigger patterns
        imagePrompt = imagePrompt
          .replace(/^(can you |could you |please |pls )/gi, '')
          .replace(/(generate|create|make|draw|design|produce|show me|paint|illustrate|render|craft|build)/gi, '')
          .replace(/(an image|a picture|a photo|an illustration|a visual|a graphic|an artwork|a drawing|a painting|image|picture|photo|art)/gi, '')
          .replace(/(of|for|about|showing|depicting|with)/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        // If extraction resulted in empty or very short prompt, use original with minimal cleanup
        if (!imagePrompt || imagePrompt.length < 3) {
          imagePrompt = input
            .replace(/^(can you |could you |please |pls )/gi, '')
            .replace(/^(generate|create|make|draw|design|show me|paint|illustrate) (an? |the )?(image|picture|photo) (of |about |showing )?/gi, '')
            .trim();
        }
        
        // Final fallback: use original input if still empty
        if (!imagePrompt || imagePrompt.length < 3) {
          imagePrompt = input.trim();
        }
        
        setGeneratingImage(true);
        
        const { data: imgData, error: imgError } = await supabase.functions.invoke('ai-image', {
          body: {
            prompt: imagePrompt,
            negative_prompt: 'blurry, low quality, distorted, bad anatomy',
          },
        });
        
        setGeneratingImage(false);
        
        if (imgError) {
          let errorMessage = imgError.message;
          if (imgError instanceof FunctionsHttpError) {
            try {
              const statusCode = imgError.context?.status ?? 500;
              const textContent = await imgError.context?.text();
              errorMessage = `[Code: ${statusCode}] ${textContent || imgError.message || 'Unknown error'}`;
            } catch {
              errorMessage = `${imgError.message || 'Failed to read response'}`;
            }
          }
          throw new Error(errorMessage);
        }
        
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          chat_id: activeChat.id,
          role: 'assistant',
          content: `Here's the image you requested: "${imagePrompt}"`,
          attachments: [{ type: 'image', url: imgData.imageUrl, name: 'generated' }],
          created_at: new Date().toISOString(),
        };

        await supabase
          .from('messages')
          .insert({
            chat_id: activeChat.id,
            role: 'assistant',
            content: assistantMessage.content,
            attachments: assistantMessage.attachments,
          });

        setMessages(prev => [...prev, assistantMessage]);
        setLoading(false);
        
      } else if (imageUrl) {
        // Use vision analysis with Prexzy GPT-4
        const { data, error } = await supabase.functions.invoke('ai-vision', {
          body: {
            imageUrl: imageUrl,
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
      setLoading(false); // Stop typing indicator immediately after response

      // Auto-generate descriptive title after first exchange (like ChatGPT) - runs in background
      if (messages.length === 0) {
        try {
          const { data: titleData, error: titleError } = await supabase.functions.invoke('ai-title', {
            body: {
              firstUserMessage: userContent,
              firstAssistantMessage: response.content,
            },
          });

          if (!titleError && titleData?.title) {
            await supabase
              .from('chats')
              .update({ title: titleData.title })
              .eq('id', activeChat.id);
            
            setChats(chats.map(c => c.id === activeChat.id ? { ...c, title: titleData.title } : c));
            setActiveChat(prev => prev ? { ...prev, title: titleData.title } : prev);
          }
        } catch (error) {
          console.error('Title generation failed:', error);
          // Fallback to simple title
          const fallbackTitle = userContent.slice(0, 50) + (userContent.length > 50 ? '...' : '');
          await supabase
            .from('chats')
            .update({ title: fallbackTitle })
            .eq('id', activeChat.id);
          
          setChats(chats.map(c => c.id === activeChat.id ? { ...c, title: fallbackTitle } : c));
        }
      }

    } catch (error: any) {
      console.error('Chat error:', error);
      toast.error(error.message || 'Failed to get response');
      setLoading(false);
    }
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
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 p-0.5">
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
          {isAdmin && (
            <Button
              onClick={() => navigate('/admin/whatsapp')}
              variant="ghost"
              className="w-full justify-start text-green-500 hover:text-green-400 hover:bg-green-500/10"
            >
              <Shield className="w-4 h-4 mr-2" />
              Admin Panel
            </Button>
          )}
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
                      Ask me anything. I can help with coding, creative writing, analysis, and more.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto mt-6">
                      <div className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Image className="w-4 h-4 text-blue-400" />
                          <p className="text-sm font-semibold text-blue-300">Image Generation</p>
                        </div>
                        <p className="text-xs text-blue-400/70">Say "generate image of..." to create AI art</p>
                      </div>
                      <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Paperclip className="w-4 h-4 text-purple-400" />
                          <p className="text-sm font-semibold text-purple-300">Vision Analysis</p>
                        </div>
                        <p className="text-xs text-purple-400/70">Upload images for AI-powered analysis</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4 max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto px-2 sm:px-0">
                {messages.map((message) => (
                  <div key={message.id} className="group">
                    <ChatMessage message={message} />
                    {message.role === 'assistant' && (
                      <button
                        onClick={() => speakMessage(message.id, message.content)}
                        className="ml-11 mt-2 text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        {speakingMessageId === message.id ? (
                          <>
                            <Volume2 className="w-3 h-3 animate-pulse" />
                            Stop reading
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
                {generatingImage && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <Image className="w-4 h-4 text-purple-400 animate-pulse" />
                    </div>
                    <div className="flex-1 bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-2xl p-4">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-purple-300">Generating image...</p>
                          <p className="text-xs text-purple-400/70">Creating your visual masterpiece</p>
                        </div>
                      </div>
                      <div className="mt-3 h-1 bg-purple-950 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse" style={{ width: '100%' }}></div>
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
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder={uploadedImageUrl ? 'Ask about the image...' : isRecording ? 'Listening...' : 'Type your message... Try "generate image of..." (Shift+Enter for new line)'}
                      disabled={loading || generatingImage}
                      rows={1}
                      className="flex-1 bg-muted border border-border rounded-2xl px-4 lg:px-6 py-2 lg:py-3 text-sm lg:text-base focus:outline-none focus:ring-2 focus:ring-primary resize-none overflow-hidden min-h-[40px] lg:min-h-[48px] max-h-48"
                      style={{
                        height: 'auto',
                      }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = target.scrollHeight + 'px';
                      }}
                    />
                    <Button 
                      onClick={sendMessage}
                      disabled={loading || generatingImage || (!input.trim() && !uploadedImageUrl)}
                      className="shrink-0 rounded-full w-10 h-10 lg:w-12 lg:h-12 p-0 bg-primary hover:bg-primary/90"
                    >
                      {generatingImage ? (
                        <Loader2 className="w-4 h-4 lg:w-5 lg:h-5 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 lg:w-5 lg:h-5" />
                      )}
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
