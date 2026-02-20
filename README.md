# PRIMIS AI

**A full-featured AI web application with multimodal capabilities**

Created by: **Damini Codesphere Organization**

---

## 🚀 Features

### Core AI Capabilities
- **💬 AI Chat** - Conversational AI with persona system
- **🖼️ Image Generation** - Create stunning AI-generated images
- **🎬 Video Generation** - Generate short AI videos
- **👁️ Vision Analysis** - Upload and analyze images with AI
- **🎤 Speech-to-Text (STT)** - Voice input with Whisper API
- **🔊 Text-to-Speech (TTS)** - Premium realistic ElevenLabs voices (5 options)
  - 3 Male voices: Alloy (Adam), Echo (Antoni), Fable (Arnold)
  - 2 Female voices: Nova (Bella), Shimmer (Elli)
- **📱 WhatsApp Integration** - AI responds to WhatsApp messages (Admin only)

### Persona System
- Choose from 5 pre-built AI personalities:
  - General Assistant
  - Creative Writer
  - Pro Coder (with Assignment Mode)
  - Academic Tutor
  - Business Consultant
- Create custom personas with tone and behavior control
- Set-once, use-everywhere persona selection

### User Features
- **🔐 Email Authentication** - Secure OTP-based login
- **💾 Saved Content** - Save chats, images, and videos
- **📤 Export Chat History** - Export conversations as Text or Markdown
- **📎 Vision Upload** - Upload images directly in chat for AI analysis
- **⚙️ Settings Panel** - Manage account, persona, and voice preferences
- **📱 Fully Responsive** - Optimized for phone, tablet, and desktop

### Pro Coder Mode
- Automatic detection when coding questions are asked
- Multi-language support (Python, JavaScript, HTML, CSS, etc.)
- Code debugging and explanation
- Full project generation
- Assignment Mode for academic problem-solving
- **Copy code blocks** with one click

### Admin Features
- **Hidden WhatsApp Admin Panel** - Monitor and manage WhatsApp AI integration
- **Message Logging** - Track all WhatsApp conversations
- **Real-time Statistics** - View message counts and status
- **7-Click Secret Access** - Click PRIMIS logo 7 times to unlock admin panel

---

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: OnSpace Cloud (Supabase-compatible)
- **AI**: OnSpace AI (GPT-5, Gemini 3, Sora 2, Veo 3) + OpenAI Fallback
- **Voice**: ElevenLabs TTS + OpenAI Whisper STT
- **WhatsApp**: Meta Business API
- **Database**: PostgreSQL with Row Level Security
- **Storage**: Supabase Storage for generated media

---

## 📋 APIs Used

### Included (OnSpace Cloud)
✅ OnSpace AI - Text generation, image generation, video generation, vision analysis  
✅ PostgreSQL Database  
✅ File Storage (images, videos)  
✅ User Authentication  
✅ Edge Functions  

### Configured
✅ **ElevenLabs API** - Ultra-realistic premium TTS voices  
✅ **Whisper API** - Advanced speech-to-text transcription  
✅ **Gemini API** - Fallback for unlimited chats when OnSpace AI balance is low  
✅ Cloudinary API - Image processing  
✅ **WhatsApp Business API** - Two-way messaging integration  

---

## 🎨 Design Features

- **Futuristic Blue Theme** - Deep blue gradient with cyan accents
- **Glowing Circular Orb Logo** - Animated cyan AI sphere with intense glow effect
- **Smooth Animations** - Micro-interactions throughout
- **Mobile-First** - Collapsible sidebar with hamburger menu
- **Professional UI** - Premium feel with shadcn/ui components
- **Large Preview Display** - Generated images/videos shown in high quality on all devices

---

## 📱 Responsive Design

- **Mobile** (< 640px) - Full-width previews, collapsible sidebar, optimized chat
- **Tablet** (640px - 1024px) - Adaptive layout
- **Desktop** (> 1024px) - Full sidebar with all features

---

## 🚀 Getting Started

### Regular Users

1. **Sign up** with your email
2. **Check spam folder** for OTP if not received (4-digit code)
3. Complete registration with username and password
4. Start chatting with AI
5. **Upload images** in chat for vision analysis
6. Explore image/video generation
7. Try voice features (voice input and read aloud)
8. Create custom personas
9. Save your favorite content
10. **Export chat history** as text or markdown

### Admin Setup (WhatsApp Integration)

See [WHATSAPP_SETUP.md](./WHATSAPP_SETUP.md) for detailed WhatsApp integration instructions.

**Quick Access:**
1. Login with admin account (damibotzinc@gmail.com)
2. Click the **PRIMIS AI logo** 7 times rapidly
3. Access WhatsApp Admin Panel at `/admin/whatsapp`

---

## 💡 Tips

- Use the **microphone button** for voice input (powered by Whisper AI)
- Click **Read aloud** on AI responses to hear them spoken (powered by ElevenLabs)
- **Upload images** with the paperclip button for vision analysis
- **Code blocks** have a copy button on hover
- **Export chat** from the top-right when in a conversation
- Select from **5 ultra-realistic voices** in Settings
- Collapse the sidebar on mobile for more chat space
- Switch personas in settings to change AI behavior
- Save generated images/videos to access them later
- **Large previews** on all devices for better viewing experience
- **WhatsApp AI** responds automatically to messages (admin feature)

---

## ⚡ API Fallback System

PRIMIS AI includes automatic fallback to prevent service interruption:

**Chat API Priority:**
1. **OnSpace AI** (Primary - Gemini 3 Flash Preview)
2. **Google Gemini 2.0 Flash** (Fallback if OnSpace AI balance runs out)
3. **Error message** (Last resort)

This ensures **unlimited chats** even when OnSpace AI credits are depleted, using your configured Gemini API key as backup.

---

## 📧 Admin Contact

Analytics and admin notifications: **damibotzinc@gmail.com**

---

## 🔒 Security

- Email OTP authentication
- Row Level Security (RLS) on all database tables
- Admin-only access to WhatsApp panel
- Server-side API key storage
- Hidden admin routes with secret access pattern
- Encrypted credential storage

---

## 📦 Deployment

Deployed on **OnSpace Cloud** with:
- Automatic HTTPS
- Global CDN
- Edge Functions for AI processing
- Real-time database sync
- Automatic backups

---

Built with ❤️ by Damini Codesphere Organization
