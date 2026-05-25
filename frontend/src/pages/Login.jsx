import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Mail, Lock, LogIn, ShieldCheck, Key, X, Send } from 'lucide-react';
import api from '../api/axios';

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

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
    const loadingToast = toast.loading('Sending reset email...');
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail });
      toast.success('Temporary password sent to your email!', { id: loadingToast });
      setShowForgotModal(false);
      setForgotEmail('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send reset email', { id: loadingToast });
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
        <div className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-accent-soft rounded-2xl border-2 border-accent/20 mb-4 shadow-[0_0_20px_rgba(249,115,22,0.1)]">
            <ShieldCheck size={32} className="text-accent" />
          </div>
          <h1 className="text-3xl font-black text-text-primary uppercase tracking-[0.2em] mb-1">
            <SplitText text="RRR Engine" />
          </h1>
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
                  type="password"
                  className="w-full bg-bg-input border-2 border-border rounded-2xl pl-12 pr-4 py-4 text-xs font-black text-text-primary outline-none focus:border-accent transition-all placeholder:text-text-muted/50"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-accent hover:bg-accent-hover text-white py-4 rounded-2xl text-xs font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-lg shadow-orange-900/20 active:scale-[0.98] transition-all mt-4"
            >
              Sign In
            </button>

            <div className="text-center pt-4">
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
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

              <h3 className="text-xl font-black text-slate-900 text-center mb-2 uppercase tracking-tight">Forgot Password</h3>
              <p className="text-xs text-slate-500 text-center font-medium mb-8 leading-relaxed">Enter your email and we'll send you a temporary password to log in.</p>

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
                      <Send size={16} /> Send Reset Email
                    </>
                  )}
                </button>
              </form>
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
