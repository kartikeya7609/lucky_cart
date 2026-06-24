import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, Shield, User, ShoppingBag, Store } from 'lucide-react';

const QUICK_ACCOUNTS = [
  { label: 'Consumer', username: 'consumer1', password: 'password123', icon: ShoppingBag, color: 'emerald' },
  { label: 'Seller', username: 'KARTIKEYA7609', password: 'password123', icon: Store, color: 'amber' },
  { label: 'Admin', username: 'admin1234', password: 'admin', icon: Shield, color: 'blue' },
];

const colorMap = {
  emerald: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20',
  amber: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20',
  blue: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20',
};

const Login = () => {
  const { login, addToast } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    setError('');
    setSubmitting(true);
    const result = await login(username, password);
    setSubmitting(false);

    if (result.success) {
      addToast('Successfully signed in.', 'success');
      if (result.isAdmin) {
        navigate('/admin/dashboard');
      } else {
        navigate('/market');
      }
    } else {
      setError(result.message || 'Invalid credentials. Check username/email and password.');
    }
  };

  const autofill = (acc) => {
    setUsername(acc.username);
    setPassword(acc.password);
    setError('');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">

        {/* Card */}
        <div className="bg-[#16191D] rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.7)] border border-white/5 overflow-hidden">
          <div className="bg-[#1C2025] p-8 md:p-10 border-b border-white/5">

            {/* Header */}
            <div className="mb-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-white rounded-xl mb-4 shadow-lg">
                <LogIn className="text-[#0F1115]" size={22} />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white">Welcome Back</h2>
              <p className="mt-1.5 text-xs text-gray-500 uppercase tracking-widest font-bold">Sign in to your account</p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold text-center">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">
                  Username or Email
                </label>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  className="w-full px-4 py-3.5 bg-[#0F1115] border border-white/10 rounded-xl text-white placeholder-gray-700 focus:outline-none focus:border-white/30 focus:bg-black/40 transition-all duration-200 text-sm"
                  placeholder="your_username@gmail.com"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(''); }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3.5 bg-[#0F1115] border border-white/10 rounded-xl text-white placeholder-gray-700 focus:outline-none focus:border-white/30 focus:bg-black/40 transition-all duration-200 text-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-4 bg-white text-black hover:bg-gray-100 font-black rounded-xl shadow-lg transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-sm uppercase tracking-widest"
              >
                {submitting ? 'Authenticating...' : 'Sign In'}
              </button>

              <div className="text-center pt-2">
                <p className="text-xs text-gray-600">
                  Don't have an account?{' '}
                  <Link to="/register" className="font-bold text-gray-400 hover:text-white transition-colors">
                    Register now
                  </Link>
                </p>
              </div>
            </form>
          </div>

          {/* Quick Access */}
          <div className="p-5 bg-[#16191D]">
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.25em] text-center mb-3">
              Quick Access — all use <span className="text-gray-400">password123</span>
            </p>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_ACCOUNTS.map((acc) => {
                const Icon = acc.icon;
                return (
                  <button
                    key={acc.label}
                    type="button"
                    onClick={() => autofill(acc)}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${colorMap[acc.color]}`}
                  >
                    <Icon size={14} />
                    {acc.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[9px] text-gray-700 text-center mt-3 uppercase tracking-widest">
              Admin password is <span className="text-gray-500">admin</span> (not password123)
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
