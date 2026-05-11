import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Mail, Lock, Eye, EyeOff, BookOpen, CheckCircle2, ShieldCheck, GraduationCap, Archive, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const user = await login(email, password);
      toast.success(`Welcome, ${user.name}`);

      if (user.role === 'master_admin') navigate('/master');
      else if (user.role === 'admin') navigate('/admin');
      else navigate('/teacher');

    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans overflow-hidden">
      {/* Left Side - Hero Section (lg only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-900 via-slate-900 to-primary-950 relative items-center justify-center p-12 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute bg-white/5 rounded-full"
              style={{
                width: Math.random() * 100 + 50,
                height: Math.random() * 100 + 50,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.1, 0.3, 0.1],
              }}
              transition={{
                duration: Math.random() * 5 + 5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        <div className="relative z-10 max-w-lg">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="w-20 h-20 bg-primary-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-primary-500/20 rotate-3 border-4 border-white/10 mb-6">
              <BookOpen size={40} />
            </div>
            <h1 className="text-6xl font-black text-white tracking-tighter mb-4">
              Grade<span className="text-primary-400 italic">Book</span>
            </h1>
            <p className="text-xl text-primary-200 font-medium tracking-wide">
              The Next Evolution of Institutional Management.
            </p>
          </motion.div>

          <div className="space-y-6 mt-12">
            {[
              { icon: ShieldCheck, text: "Secure role-based access control.", color: "text-blue-400" },
              { icon: GraduationCap, text: "Real-time student & result management.", color: "text-emerald-400" },
              { icon: Archive, text: "Simplified PDF report generation & archiving.", color: "text-amber-400" }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-4 group"
              >
                <div className={`p-3 rounded-2xl bg-white/5 border border-white/10 group-hover:bg-white/10 transition-all ${feature.color}`}>
                  <feature.icon size={24} />
                </div>
                <span className="text-lg text-slate-300 font-medium">{feature.text}</span>
              </motion.div>
            ))}
          </div>

          <div className="mt-16 flex items-center gap-4 text-slate-500 font-mono text-xs tracking-widest uppercase">
            <div className="h-px bg-slate-800 flex-1"></div>
            <span>Powering Future Education</span>
            <div className="h-px bg-slate-800 flex-1"></div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 bg-white flex items-center justify-center p-4 sm:p-8 md:p-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Logo & Header */}
          <div className="text-center mb-10">
            <div className="inline-flex lg:hidden w-16 h-16 bg-primary-600 rounded-2xl items-center justify-center text-white mb-4 shadow-xl shadow-primary-600/20">
              <BookOpen size={32} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Welcome Back</h2>
            <p className="text-slate-500 font-medium">Please enter your credentials to login</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="input-label" htmlFor="email">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary-500 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="admin@schoolerp.com"
                  className="input-field pl-11"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="input-label" htmlFor="password">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary-500 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  className="input-field pl-11 pr-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-primary-500 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-200 text-primary-600 focus:ring-primary-500" />
                <span className="text-xs font-semibold text-slate-500">Remember Me</span>
              </label>
              <button type="button" className="text-xs font-bold text-primary-600 hover:text-primary-700">Forgot Password?</button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary !py-3.5 !text-base flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <footer className="mt-12 pt-8 border-t border-slate-100 flex flex-col items-center gap-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              Admin Control Panel • v1.0.0
            </p>
            <div className="flex items-center gap-4 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider italic">Secure Environment Ready</span>
            </div>
          </footer>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
