
import React, { useState } from 'react';
import { UserRole, UserProfile, QuizSet } from './types';
import { LearnerView } from './components/LearnerView';
import { AdminView } from './components/AdminView';
import { LoginView } from './components/LoginView';
import { QuizSetSelector } from './components/QuizSetSelector';
import { ShieldCheck, LogOut } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [selectedQuizSet, setSelectedQuizSet] = useState<QuizSet | null>(null);

  const handleLogin = (user: UserProfile) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedQuizSet(null);
  };

  // If not logged in, show login screen
  if (!currentUser) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-900">
      {/* Header / Navigation */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="w-full px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSelectedQuizSet(null)}>
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <span className="font-bold text-2xl">G</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 hidden sm:block">
              GuessWork <span className="text-indigo-600">Learning</span>
            </h1>
          </div>

          <div className="flex items-center gap-6">
            {currentUser.role === UserRole.ADMIN && (
                <div className="flex items-center gap-2 px-4 py-1.5 bg-rose-50 text-rose-700 rounded-full text-sm font-bold border border-rose-100">
                  <ShieldCheck className="w-4 h-4" /> ADMIN MODE
                </div>
            )}
            
            <div className="flex items-center gap-4 pl-6 border-l border-slate-200">
               <div className="text-right hidden sm:block">
                   <p className="text-base font-bold text-slate-800">{currentUser.name}</p>
                   <p className="text-sm text-slate-500">{currentUser.email}</p>
               </div>
               <img 
                 src={currentUser.avatarUrl} 
                 alt="Avatar" 
                 className="w-10 h-10 rounded-full border border-slate-200"
               />
               <button 
                 onClick={handleLogout}
                 className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                 title="Sign Out"
               >
                   <LogOut className="w-6 h-6" />
               </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full px-6 lg:px-8 py-10">
        {currentUser.role === UserRole.ADMIN ? (
            <AdminView user={currentUser} />
        ) : (
            selectedQuizSet ? (
                <LearnerView quizSet={selectedQuizSet} currentUser={currentUser} onBack={() => setSelectedQuizSet(null)} />
            ) : (
                <QuizSetSelector onSelect={setSelectedQuizSet} />
            )
        )}
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-slate-400 text-base">
        <p>© 2024 GuessWork Learning. Educational Insights.</p>
      </footer>
    </div>
  );
};

export default App;
