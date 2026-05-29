import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Mail, Lock, LogIn, ShieldCheck, Key, X, Send, Eye, EyeOff } from 'lucide-react';
import api from '../api/axios';

import IntroAnimation from '../components/IntroAnimation';

const SplitText = ({ text, className }) => {
  return (
    <span className={className}>
      {text.split("").map((char, index) => (
        <span
          key={index}
          className="animate-char-in"
          style={{
            animationDelay: `${index * 0.04}s`,
            whiteSpace: char === ' ' ? 'pre' : 'normal'
          }}
        >
          {char}
        </span>
      ))}
    </span>
  );
};

const Login = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotStep, setForgotStep] = useState('email'); // 'email' or 'otp'
  const [forgotOTP, setForgotOTP] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const { login, loginWithGoogle } = useContext(AuthContext);
  const navigate = useNavigate();

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  React.useEffect(() => {
    if (showIntro || !clientId) return;

    // Dynamically inject the Google GSI script
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleLogin,
          });
          window.google.accounts.id.renderButton(
            document.getElementById("googleSignInDiv"),
            { 
              theme: "outline", 
              size: "large", 
              width: "360",
              text: "signin_with",
              shape: "pill",
            }
          );
        } catch (e) {
          console.error("Google accounts initialisation failed:", e);
        }
      }
    };

    return () => {
      try {
        document.body.removeChild(script);
      } catch (e) {}
    };
  }, [showIntro, clientId]);

  const handleGoogleLogin = async (response) => {
    const loadingToast = toast.loading('Authenticating via Google...');
    try {
      await loginWithGoogle(response.credential);
      toast.success('Logged in successfully via Google', { id: loadingToast });
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Google login failed', { id: loadingToast });
    }
  };

  if (showIntro) {
    return <IntroAnimation onComplete={() => setShowIntro(false)} />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const loadingToast = toast.loading('Authenticating...');
    try {
      await login(email, password);
      toast.success('Logged in successfully', { id: loadingToast });
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed', { id: loadingToast });
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return toast.error("Please enter your email");

    setForgotLoading(true);
    const loadingToast = toast.loading('Sending verification code...');
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail });
      toast.success('Verification code sent to your email!', { id: loadingToast });
      setForgotStep('otp');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send verification code', { id: loadingToast });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!forgotOTP) return toast.error("Please enter the verification code");
    if (!forgotNewPassword) return toast.error("Please enter a new password");
    if (forgotNewPassword !== forgotConfirmPassword) {
      return toast.error("Passwords do not match");
    }

    setForgotLoading(true);
    const loadingToast = toast.loading('Resetting password...');
    try {
      await api.post('/auth/reset-password', { 
        email: forgotEmail, 
        otp: forgotOTP, 
        newPassword: forgotNewPassword 
      });
      toast.success('Password reset successfully! You can now login.', { id: loadingToast });
      setShowForgotModal(false);
      setForgotEmail('');
      setForgotOTP('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
      setForgotStep('email');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reset password', { id: loadingToast });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!forgotEmail) return toast.error("Email not found");
    setForgotLoading(true);
    const loadingToast = toast.loading('Resending verification code...');
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail });
      toast.success('A new verification code has been sent to your email!', { id: loadingToast });
      setForgotOTP('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to resend verification code', { id: loadingToast });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue/5 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8 flex flex-col items-center relative overflow-hidden">
          <img 
            src="/cfi-logo.png" 
            alt="CFI India Network" 
            className="w-56 h-auto object-contain drop-shadow-[0_4px_12px_rgba(11,114,184,0.06)] select-none animate-logo-wipe" 
          />
          <style>{`
            @keyframes logoWipe {
              0% {
                clip-path: inset(0 100% 0 0);
                transform: translateX(-12px);
                opacity: 0;
              }
              35% {
                opacity: 1;
              }
              100% {
                clip-path: inset(0 0 0 0);
                transform: translateX(0);
                opacity: 1;
              }
            }
            .animate-logo-wipe {
              animation: logoWipe 1.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
              animation-delay: 0.25s;
              opacity: 0;
            }
          `}</style>
        </div>

        {/* Login Card */}
        <div className="bg-bg-card border-2 border-border rounded-3xl p-10 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
          <div className="mb-8">
            <h2 className="text-xl font-black text-text-primary uppercase tracking-widest mb-1">
              <SplitText text="Log In" />
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent transition-colors">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  className="w-full bg-bg-input border-2 border-border rounded-2xl pl-12 pr-4 py-4 text-xs font-black text-text-primary outline-none focus:border-accent transition-all placeholder:text-text-muted/50"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Password</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent transition-colors">
                  <Lock size={16} />
                </div>
                <input
                  type={showLoginPassword ? "text" : "password"}
                  className="w-full bg-bg-input border-2 border-border rounded-2xl pl-12 pr-12 py-4 text-xs font-black text-text-primary outline-none focus:border-accent transition-all placeholder:text-text-muted/50"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                >
                  {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-accent hover:bg-accent-hover text-white py-4 rounded-2xl text-xs font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-lg shadow-orange-900/20 active:scale-[0.98] transition-all mt-4"
            >
              Sign In
            </button>

            {clientId ? (
              <div className="space-y-4">
                <div className="flex items-center my-4">
                  <div className="flex-grow border-t border-border/60"></div>
                  <span className="px-3 text-[10px] font-black text-text-muted uppercase tracking-widest">or</span>
                  <div className="flex-grow border-t border-border/60"></div>
                </div>
                <div className="flex justify-center w-full min-h-[46px]" id="googleSignInDiv"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center my-4">
                  <div className="flex-grow border-t border-border/60"></div>
                  <span className="px-3 text-[10px] font-black text-text-muted uppercase tracking-widest">or</span>
                  <div className="flex-grow border-t border-border/60"></div>
                </div>
                <button
                  type="button"
                  onClick={() => toast.error("Google Login is not configured. Please add VITE_GOOGLE_CLIENT_ID to your frontend .env file.")}
                  className="w-full bg-transparent border-2 border-border hover:bg-bg-input text-text-primary py-4 rounded-2xl text-xs font-black uppercase tracking-[0.15em] flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign In with Google
                </button>
              </div>
            )}

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setForgotEmail('');
                  setForgotOTP('');
                  setForgotNewPassword('');
                  setForgotConfirmPassword('');
                  setForgotStep('email');
                  setShowForgotModal(true);
                }}
                className="text-[10px] font-black text-text-muted hover:text-accent uppercase tracking-widest transition-colors flex items-center justify-center gap-2 mx-auto"
              >
                <Key size={12} /> Forgot Password?
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl border border-slate-200 animate-zoom-in relative">
            <div className="p-10">
              <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner border border-amber-100">
                <Key size={32} className="text-amber-500" />
              </div>

              {forgotStep === 'email' ? (
                <>
                  <h3 className="text-xl font-black text-slate-900 text-center mb-2 uppercase tracking-tight">Forgot Password</h3>
                  <p className="text-xs text-slate-500 text-center font-medium mb-8 leading-relaxed">Enter your email and we'll send you a verification code to reset your password.</p>

                  <form onSubmit={handleForgotPassword} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                      <input
                        type="email"
                        required
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-amber-500/50 focus:bg-white outline-none transition-all text-sm font-bold"
                        placeholder="your@email.com"
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full py-4.5 rounded-2xl bg-amber-600 text-white font-black text-xs uppercase tracking-[0.2em] hover:bg-amber-700 shadow-xl shadow-amber-900/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                      {forgotLoading ? 'Sending...' : (
                        <>
                          <Send size={16} /> Send Code
                        </>
                      )}
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-black text-slate-900 text-center mb-2 uppercase tracking-tight">Reset Password</h3>
                  <p className="text-xs text-slate-500 text-center font-medium mb-6 leading-relaxed">We sent a verification code to <span className="font-bold text-slate-700">{forgotEmail}</span>.</p>

                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Verification Code</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-amber-500/50 focus:bg-white outline-none transition-all text-sm font-bold tracking-[0.3em] text-center"
                        placeholder="123456"
                        value={forgotOTP}
                        onChange={e => setForgotOTP(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          required
                          className="w-full px-5 pr-12 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-amber-500/50 focus:bg-white outline-none transition-all text-sm font-bold"
                          placeholder="••••••••"
                          value={forgotNewPassword}
                          onChange={e => setForgotNewPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          className="w-full px-5 pr-12 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-amber-500/50 focus:bg-white outline-none transition-all text-sm font-bold"
                          placeholder="••••••••"
                          value={forgotConfirmPassword}
                          onChange={e => setForgotConfirmPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full py-4 rounded-2xl bg-amber-600 text-white font-black text-xs uppercase tracking-[0.2em] hover:bg-amber-700 shadow-xl shadow-amber-900/20 transition-all active:scale-95 flex items-center justify-center gap-3 mt-2"
                    >
                      {forgotLoading ? 'Updating...' : (
                        <>
                          <Key size={16} /> Reset Password
                        </>
                      )}
                    </button>

                    <div className="text-center pt-2 flex items-center justify-between text-[9px] font-black uppercase tracking-widest px-1">
                      <button
                        type="button"
                        onClick={() => {
                          setForgotStep('email');
                          setForgotOTP('');
                        }}
                        className="text-slate-400 hover:text-amber-600 transition-colors"
                      >
                        ← Back to Email
                      </button>

                      <button
                        type="button"
                        disabled={forgotLoading}
                        onClick={handleResendOTP}
                        className="text-amber-600 hover:text-amber-700 disabled:text-slate-400 transition-colors"
                      >
                        {forgotLoading ? 'Resending...' : 'Resend Code'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>

            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-500 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
