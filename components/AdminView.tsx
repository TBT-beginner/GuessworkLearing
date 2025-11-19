
import React, { useState, useEffect } from 'react';
import { getAdminStatsForSet, getQuizSets, resetAdminStats, getAdminWhitelist, addAdmin, removeAdmin } from '../services/storage';
import { AdminQuestionStats, QuizSet, UserProfile } from '../types';
import { QuizEditor } from './QuizEditor';
import { RefreshCw, FileBarChart, Settings, BookOpen, UserPlus, X } from 'lucide-react';

interface AdminViewProps {
    user: UserProfile;
}

type AdminMode = 'INSIGHTS' | 'CONTENT' | 'USERS';

export const AdminView: React.FC<AdminViewProps> = ({ user }) => {
  const [mode, setMode] = useState<AdminMode>('INSIGHTS');
  const [selectedSetId, setSelectedSetId] = useState<string>('');
  const [stats, setStats] = useState<AdminQuestionStats[]>([]);
  const [quizSets, setQuizSets] = useState<QuizSet[]>([]);
  
  // User Management State
  const [adminList, setAdminList] = useState<string[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');

  useEffect(() => {
    const sets = getQuizSets();
    setQuizSets(sets);
    if (sets.length > 0) {
        setSelectedSetId(sets[0].id);
    }
    setAdminList(getAdminWhitelist());
  }, []);

  useEffect(() => {
      if (selectedSetId) {
          const data = getAdminStatsForSet(selectedSetId);
          setStats(data);
      }
  }, [selectedSetId, mode]);

  const handleResetData = () => {
      if(window.confirm("Are you sure you want to reset all results? This cannot be undone.")) {
          resetAdminStats(); 
          window.location.reload(); 
      }
  }

  const handleAddAdmin = (e: React.FormEvent) => {
      e.preventDefault();
      if(newAdminEmail && newAdminEmail.includes('@')) {
          addAdmin(newAdminEmail);
          setAdminList(getAdminWhitelist());
          setNewAdminEmail('');
      }
  }

  const handleRemoveAdmin = (email: string) => {
      removeAdmin(email);
      setAdminList(getAdminWhitelist());
  }

  // Prepare data for chart
  const chartData = [...stats]
    .sort((a, b) => a.originalIndex - b.originalIndex)
    .map(s => ({
      id: s.questionId,
      name: `Q${s.originalIndex}`,
      attempts: s.totalAttempts,
      errors: s.errorCount,
      errorRate: s.totalAttempts > 0 ? (s.errorCount / s.totalAttempts) * 100 : 0,
      questionText: s.questionText,
    }));

  const maxErrors = Math.max(...chartData.map(d => d.errors), 5); // Min 5 scale

  if (mode === 'CONTENT') {
      return <QuizEditor user={user} onBack={() => setMode('INSIGHTS')} />;
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Admin Nav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-slate-200 pb-6">
        <div>
            <h2 className="text-4xl font-bold text-slate-800">Admin Dashboard</h2>
            <p className="text-slate-500 mt-2 text-lg">Welcome, {user.name}</p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-xl">
            <button 
                onClick={() => setMode('INSIGHTS')}
                className={`px-6 py-3 rounded-lg text-base font-bold transition-colors flex items-center gap-2 ${mode === 'INSIGHTS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <FileBarChart className="w-5 h-5" /> Insights
            </button>
            <button 
                onClick={() => setMode('CONTENT')}
                className="px-6 py-3 rounded-lg text-base font-bold transition-colors flex items-center gap-2 text-slate-500 hover:text-slate-700"
            >
                <BookOpen className="w-5 h-5" /> Manage Quiz Sets
            </button>
            <button 
                onClick={() => setMode('USERS')}
                className={`px-6 py-3 rounded-lg text-base font-bold transition-colors flex items-center gap-2 ${mode === 'USERS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Settings className="w-5 h-5" /> Access
            </button>
        </div>
      </div>

      {mode === 'USERS' && (
           <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-10">
               <h3 className="text-2xl font-bold text-slate-800 mb-8 flex items-center gap-3">
                   <UserPlus className="w-6 h-6" /> Manage Admins
               </h3>
               
               <form onSubmit={handleAddAdmin} className="flex gap-4 mb-10">
                   <input 
                        type="email" 
                        placeholder="colleague@kiryo.ac.jp"
                        className="flex-1 px-6 py-4 text-lg border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                   />
                   <button type="submit" className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg">Add</button>
               </form>

               <div className="space-y-4">
                   {adminList.map(email => (
                       <div key={email} className="flex justify-between items-center p-6 bg-slate-50 rounded-xl border border-slate-100">
                           <span className="font-medium text-xl text-slate-700">{email}</span>
                           {email !== 'tobita@kiryo.ac.jp' ? (
                               <button onClick={() => handleRemoveAdmin(email)} className="text-rose-500 hover:bg-rose-100 p-3 rounded-lg transition-colors">
                                   <X className="w-6 h-6" />
                               </button>
                           ) : (
                               <span className="text-sm font-bold bg-indigo-100 text-indigo-600 px-3 py-1 rounded-lg">ROOT</span>
                           )}
                       </div>
                   ))}
               </div>
           </div>
      )}

      {mode === 'INSIGHTS' && (
        <>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <label className="text-lg font-bold text-slate-500">Viewing Set:</label>
                    <select 
                        value={selectedSetId}
                        onChange={(e) => setSelectedSetId(e.target.value)}
                        className="bg-white border border-slate-300 text-slate-800 font-bold text-lg py-3 px-6 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        {quizSets.map(set => (
                            <option key={set.id} value={set.id}>{set.title}</option>
                        ))}
                    </select>
                </div>
                <button 
                    onClick={handleResetData}
                    className="text-slate-500 hover:text-rose-600 flex items-center gap-2 text-base font-medium transition-colors"
                >
                    <RefreshCw className="w-5 h-5" /> Reset All User Data
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Custom CSS Chart Section */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-700 text-xl mb-8 flex items-center gap-3">
                        <FileBarChart className="w-6 h-6 text-indigo-600" />
                        Error Frequency by Question Sequence
                    </h3>
                    
                    {chartData.length > 0 ? (
                        <div className="w-full h-[400px] flex items-end justify-between gap-2 p-4 border-b border-l border-slate-200">
                            {chartData.map((item) => {
                                const heightPercentage = (item.errors / maxErrors) * 100;
                                const isHighRisk = item.errorRate > 50;
                                return (
                                    <div key={item.id} className="flex-1 flex flex-col items-center group relative">
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs rounded-lg p-2 w-48 z-10 pointer-events-none">
                                            <div className="font-bold">{item.name}</div>
                                            <div>{item.questionText.substring(0, 50)}...</div>
                                            <div className="mt-1 pt-1 border-t border-slate-600 flex justify-between">
                                                <span>Errors:</span>
                                                <span className="font-bold">{item.errors}/{item.attempts}</span>
                                            </div>
                                        </div>
                                        
                                        {/* Bar */}
                                        <div 
                                            style={{ height: `${Math.max(heightPercentage, 4)}%` }} 
                                            className={`w-full rounded-t-md transition-all duration-300 ${isHighRisk ? 'bg-rose-500 hover:bg-rose-600' : 'bg-indigo-500 hover:bg-indigo-600'}`}
                                        ></div>
                                        
                                        {/* Label */}
                                        <div className="text-xs text-slate-500 font-bold mt-2">{item.name}</div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="h-[400px] w-full flex items-center justify-center text-slate-400 text-lg bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            No attempts recorded yet.
                        </div>
                    )}
                    <div className="mt-6 text-sm text-center text-slate-400">
                        Bars represent total error count. Red indicates &gt;50% error rate. Hover for details.
                    </div>
                </div>

                {/* Detailed List */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
                    <h3 className="font-bold text-slate-700 text-xl mb-6">Problem Areas (Highest Errors First)</h3>
                    <div className="flex-1 overflow-y-auto pr-4 space-y-4 custom-scrollbar">
                        {stats.map((item) => (
                            <div key={item.questionId} className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-black text-white bg-slate-400 px-2 py-1 rounded">Q{item.originalIndex}</span>
                                        <span className="text-sm font-bold uppercase text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">{item.area}</span>
                                    </div>
                                    <span className="text-sm font-bold text-slate-500">{item.errorCount} / {item.totalAttempts} Errors</span>
                                </div>
                                <p className="text-lg text-slate-800 font-medium leading-snug">{item.questionText}</p>
                                {Object.keys(item.wrongOptionsDistribution).length > 0 && (
                                    <div className="mt-3 text-sm text-rose-500 font-medium">
                                        Top mistake: Option {Object.entries(item.wrongOptionsDistribution).sort(([,a]: [string, number], [,b]: [string, number]) => b-a)[0][0]}
                                    </div>
                                )}
                            </div>
                        ))}
                        {stats.length === 0 && <p className="text-slate-400 text-center py-20 text-lg">No data available.</p>}
                    </div>
                </div>
            </div>
        </>
      )}
    </div>
  );
};
    