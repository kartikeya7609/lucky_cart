import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { Lock } from 'lucide-react';

const AdminLogin = () => {
  const { login, addToast } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await api.post('/auth/admin-login', { username, password });
      login(data.token, data.user);
      addToast('Admin session initialized successfully.', 'success');
      navigate('/admin/dashboard');
    } catch (err) {
      addToast(err.message || 'Invalid administrator credentials.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full p-1 bg-[#16191D] rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-white/5">
        <div className="bg-[#1C2025] p-8 md:p-10 rounded-[1.8rem] border border-white/[0.02]">
          <div className="mb-10 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-500 rounded-xl mb-4 shadow-lg shadow-amber-500/20">
              <Lock className="text-[#0F1115]" size={24} />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Admin Terminal</h2>
            <p className="mt-2 text-sm text-gray-500">Authorized Personnel Only</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-2 ml-1">Admin ID</label>
                <input 
                  type="text" 
                  required 
                  className="w-full px-4 py-4 bg-[#121418] border border-[#2A2F36] rounded-xl text-white focus:outline-none focus:border-amber-500/20 transition-all placeholder:text-gray-800" 
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-2 ml-1">Passkey</label>
                <input 
                  type="password" 
                  required 
                  className="w-full px-4 py-4 bg-[#121418] border border-[#2A2F36] rounded-xl text-white focus:outline-none focus:border-amber-500/20 transition-all placeholder:text-gray-800" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 bg-amber-500 text-black hover:bg-amber-400 font-bold rounded-xl shadow-xl shadow-amber-500/10 transition-all active:scale-[0.98]"
              >
                {loading ? 'Decrypting credentials...' : 'Unlock Console'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
