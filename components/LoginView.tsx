
import React, { useState } from 'react';
import { UserRole, UserProfile } from '../types';
import { getAdminWhitelist } from '../services/storage';

interface LoginViewProps {
  onLogin: (user: UserProfile) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);

    // Simulation delay
    setTimeout(() => {
      const admins = getAdminWhitelist();
      const isAdmin = admins.includes(email);

      const user: UserProfile = {
        email,
        name: email.split('@')[0], // Mock name from email
        role: isAdmin ? UserRole.ADMIN : UserRole.LEARNER,
        avatarUrl: `https://ui-avatars.com/api/?name=${email.split('@')[0]}&background=random`
      };

      onLogin(user);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-indigo-600 p-10 text-center">
           <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <span className="font-bold text-4xl text-indigo-600">G</span>
           </div>
           <h1 className="text-3xl font-bold text-white">GuessWork Learning</h1>
           <p className="text-indigo-200 mt-3 text-lg">Sign in to continue</p>
        </div>
        
        <div className="p-10">
          <form onSubmit={handleLogin} className="space-y-8">
             <div>
                <label htmlFor="email" className="block text-base font-bold text-slate-700 mb-2">
                  Google Account Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-6 py-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-lg"
                />
             </div>

             <button
               type="submit"
               disabled={loading}
               className="w-full bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-4 transition-all shadow-sm text-lg"
             >
               {loading ? (
                 <span>Signing in...</span>
               ) : (
                 <>
                   <svg className="w-6 h-6" viewBox="0 0 24 24">
                     <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                     <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                     <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                     <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                   </svg>
                   Sign in with Google
                 </>
               )}
             </button>
          </form>
        </div>
      </div>
    </div>
  );
};