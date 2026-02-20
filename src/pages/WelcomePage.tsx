import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Mail, Lock, User, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import BrainLogo from '@/components/layout/BrainLogo';

export default function WelcomePage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mode, setMode] = useState<'welcome' | 'login' | 'signup' | 'create'>('welcome');
  const [loading, setLoading] = useState(false);
  
  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup state
  const [signupEmail, setSignupEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    try {
      const user = await authService.signInWithPassword(loginEmail, loginPassword);
      login(authService.mapUser(user));
      navigate('/');
    } catch (error: any) {
      toast.error(error.message);
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setLoading(true);
    try {
      await authService.sendOtp(signupEmail);
      setOtpSent(true);
      toast.success('Verification code sent to your email');
      setLoading(false);
    } catch (error: any) {
      toast.error(error.message);
      setLoading(false);
    }
  };

  const handleVerifyAndSignup = async () => {
    if (!username.trim()) {
      toast.error('Please enter a username');
      return;
    }
    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    try {
      const user = await authService.verifyOtpAndSetPassword(signupEmail, otp, password, username);
      login(authService.mapUser(user));
      navigate('/');
    } catch (error: any) {
      toast.error(error.message);
      setLoading(false);
    }
  };

  if (mode === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#001a4d] via-[#002b7a] to-[#001a4d] flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-fade-in">
          <div className="flex flex-col items-center mb-12">
            <div className="w-48 h-48 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 p-1 shadow-2xl shadow-cyan-500/50 mb-6">
              <div className="w-full h-full rounded-full bg-[#001a4d] flex items-center justify-center">
                <BrainLogo size="large" />
              </div>
            </div>
            <h1 className="text-5xl font-bold text-primary mb-2 text-glow tracking-wider">PRIMIS</h1>
            <div className="flex items-center gap-2 text-accent">
              <Sparkles className="w-5 h-5" />
              <p className="text-2xl font-light tracking-[0.3em]">AI</p>
            </div>
          </div>

          <h2 className="text-3xl font-semibold text-white text-center mb-3">
            Welcome to PRIMIS AI
          </h2>
          <p className="text-muted-foreground text-center mb-12">
            Your gateway to the future of artificial intelligence
          </p>

          <div className="space-y-4">
            <Button
              onClick={() => setMode('login')}
              className="w-full h-14 bg-transparent border-2 border-primary text-white text-lg hover:bg-primary/10 transition-all duration-300"
            >
              Login
            </Button>

            <Button
              onClick={() => setMode('signup')}
              className="w-full h-14 bg-transparent border-2 border-accent text-white text-lg hover:bg-accent/10 transition-all duration-300"
            >
              Create Account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#001a4d] via-[#002b7a] to-[#001a4d] flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-fade-in">
          <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 p-0.5 mb-4">
              <div className="w-full h-full rounded-full bg-[#001a4d] flex items-center justify-center">
                <BrainLogo size="medium" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-primary text-glow">PRIMIS AI</h1>
          </div>

          <div className="glass rounded-2xl p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-white mb-2">Welcome Back</h2>
              <p className="text-muted-foreground">Sign in to continue your AI journey</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="pl-10 h-12 bg-background/50 border-border"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    className="pl-10 h-12 bg-background/50 border-border"
                  />
                </div>
              </div>

              <Button
                onClick={handleLogin}
                disabled={loading || !loginEmail || !loginPassword}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-background font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </div>

            <div className="text-center">
              <button
                onClick={() => setMode('welcome')}
                className="text-sm text-accent hover:text-accent/80 transition-colors"
              >
                ← Back to welcome
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'signup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#001a4d] via-[#002b7a] to-[#001a4d] flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-fade-in">
          <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 p-0.5 mb-4">
              <div className="w-full h-full rounded-full bg-[#001a4d] flex items-center justify-center">
                <BrainLogo size="medium" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-primary text-glow">PRIMIS AI</h1>
          </div>

          <div className="glass rounded-2xl p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-white mb-2">Create Account</h2>
              <p className="text-muted-foreground">Get started with PRIMIS AI</p>
            </div>

            {!otpSent ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="pl-10 h-12 bg-background/50 border-border"
                    />
                  </div>
                </div>

                <div className="flex items-start gap-2 text-yellow-400 text-xs bg-yellow-400/10 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>Check your spam folder if you don't see the email from <span className="font-semibold">PRIMIS AUTH</span></p>
                </div>

                <Button
                  onClick={handleSendOtp}
                  disabled={loading || !signupEmail}
                  className="w-full h-12 bg-accent hover:bg-accent/90 text-background font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Verification Code'
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Verification Code</label>
                  <Input
                    type="text"
                    placeholder="Enter 4-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    maxLength={4}
                    className="h-12 bg-background/50 border-border text-center text-2xl tracking-widest"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Choose a username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10 h-12 bg-background/50 border-border"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleVerifyAndSignup()}
                      className="pl-10 h-12 bg-background/50 border-border"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleVerifyAndSignup}
                  disabled={loading || !otp || !username || password.length < 6}
                  className="w-full h-12 bg-accent hover:bg-accent/90 text-background font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </div>
            )}

            <div className="text-center">
              <button
                onClick={() => {
                  setMode('welcome');
                  setOtpSent(false);
                }}
                className="text-sm text-accent hover:text-accent/80 transition-colors"
              >
                ← Back to welcome
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
