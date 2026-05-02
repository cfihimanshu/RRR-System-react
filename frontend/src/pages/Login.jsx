import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Mail, Lock, LogIn, ShieldCheck } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0e14] p-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue/5 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo/Brand Section */}
        <div className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-accent-soft rounded-2xl border-2 border-accent/20 mb-4 shadow-[0_0_20px_rgba(249,115,22,0.1)]">
            <ShieldCheck size={32} className="text-accent" />
          </div>
          <h1 className="text-3xl font-black text-text-primary uppercase tracking-[0.2em] mb-1">RRR Engine</h1>
        </div>

        {/* Login Card */}
        <div className="bg-[#151b28] border-2 border-[#161d2b] rounded-3xl p-10 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
          <div className="mb-8">
            <h2 className="text-xl font-black text-text-primary uppercase tracking-widest mb-1">Log In </h2>
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
                  className="w-full bg-[#0f1521] border-2 border-[#161d2b] rounded-2xl pl-12 pr-4 py-4 text-xs font-black text-text-primary outline-none focus:border-accent transition-all placeholder:text-text-muted/50"
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
                  className="w-full bg-[#0f1521] border-2 border-[#161d2b] rounded-2xl pl-12 pr-4 py-4 text-xs font-black text-text-primary outline-none focus:border-accent transition-all placeholder:text-text-muted/50"
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
          </form>
        </div>

      </div>
    </div>
  );
};

export default Login;
