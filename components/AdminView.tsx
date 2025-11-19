
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getAdminStatsForSet, getQuizSets, resetAdminStats, getAdminWhitelist, addAdmin, removeAdmin } from '../services/storage';
import { AdminQuestionStats, QuizSet, UserProfile } from '../types';
import { generateAdminInsights } from '../services/geminiService';
import { QuizEditor } from './QuizEditor';
import { BrainCircuit, RefreshCw, FileBarChart, Loader2, Settings, BookOpen, UserPlus, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AdminViewProps {
    user: UserProfile;
}

type AdminMode = 'INSIGHTS' | 'CONTENT' | 'USERS';

export const AdminView: React.FC<AdminViewProps> = ({ user }) => {
  const [mode, setMode] = useState<AdminMode>('INSIGHTS');
  const [selectedSetId, setSelectedSetId] = useState<string>('');
  const [stats, setStats] = useState<AdminQuestionStats[]>([]);
  const [quizSets, setQuizSets] = useState<QuizSet[]>([]);
  const [insights, setInsights] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  
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
          setInsights(null); // Reset insights when switching sets
      }
  }, [selectedSetId, mode]); // Refresh on mode switch just in case

  const handleGenerateInsights = async () => {
    setLoadingAI(true);
    const result = await generateAdminInsights(stats);
    setInsights(result);
    setLoadingAI(false);
  };

  const handleResetData = () => {
      if(window.confirm("Are you sure you want to reset all results? This cannot be undone.")) {
          resetAdminStats(); // This actually clears everything in localStorage results
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
  // We sort by question index (chronological order) for the chart to make it easier to find questions
  const chartData = [...stats]
    .sort((a, b) => a.originalIndex - b.originalIndex)
    .map(s => ({
      name: `Q${s.originalIndex}`,
      attempts: s.totalAttempts,
      errors: s.errorCount,
      errorRate: s.totalAttempts > 0 ? (s.errorCount / s.totalAttempts) * 100 : 0,
      questionText: s.questionText,
    }));

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
                {/* Chart Section */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-700 text-xl mb-8 flex items-center gap-3">
                    <FileBarChart className="w-6 h-6 text-indigo-600" />
                    Error Frequency by Question Sequence
                </h3>
                {chartData.length > 0 ? (
                     <div className="h-[450px] w-full">
                     <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                         <XAxis dataKey="name" stroke="#64748b" fontSize={14} tickLine={false} axisLine={false} />
                         <YAxis stroke="#64748b" fontSize={14} tickLine={false} axisLine={false} />
                         <Tooltip 
                             cursor={{fill: '#f1f5f9'}}
                             content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-white p-4 border border-slate-200 shadow-xl rounded-xl max-w-xs z-50">
                                      <p className="font-bold text-indigo-600 mb-1 text-base">{label}</p>
                                      <p className="text-slate-700 text-sm mb-3 leading-snug">{payload[0].payload.questionText}</p>
                                      <div className="flex justify-between text-sm font-medium text-slate-500 border-t border-slate-100 pt-2">
                                          <span>Error Rate:</span>
                                          <span className={`font-bold ${Number(payload[0].value) > 50 ? 'text-rose-500' : 'text-emerald-600'}`}>
                                              {Number(payload[0].value).toFixed(1)}%
                                          </span>
                                      </div>
                                      <div className="flex justify-between text-sm font-medium text-slate-500 mt-1">
                                          <span>Count:</span>
                                          <span>{payload[0].payload.errors} / {payload[0].payload.attempts}</span>
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                         />
                         <Bar dataKey="errors" fill="#6366f1" radius={[6, 6, 0, 0]}>
                             {chartData.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={entry.errorRate > 50 ? '#f43f5e' : '#6366f1'} />
                             ))}
                         </Bar>
                     </BarChart>
                     </ResponsiveContainer>
                 </div>
                ) : (
                    <div className="h-[450px] w-full flex items-center justify-center text-slate-400 text-lg">No attempts recorded yet.</div>
                )}
               
                <div className="mt-6 text-sm text-center text-slate-400">
                    Bars ordered by question number (Q1, Q2...). Red bars indicate >50% error rate.
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

            {/* AI Insights Section */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl shadow-xl overflow-hidden text-white">
                <div className="p-10 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/10 p-3 rounded-xl">
                                <BrainCircuit className="w-8 h-8 text-indigo-300" />
                            </div>
                            <div>
                                <h3 className="text-3xl font-bold">AI Performance Analysis</h3>
                                <p className="text-indigo-200 text-base mt-1">Powered by Gemini 2.5 Flash</p>
                            </div>
                        </div>
                        <button
                            onClick={handleGenerateInsights}
                            disabled={loadingAI || stats.reduce((acc, curr) => acc + curr.errorCount, 0) === 0}
                            className="bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white px-8 py-4 rounded-xl font-bold transition-all flex items-center gap-3 shadow-lg shadow-indigo-900/20 text-lg"
                        >
                            {loadingAI ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Analyze Weaknesses'}
                        </button>
                    </div>
                </div>
                <div className="p-10 min-h-[250px] bg-white/5">
                    {insights ? (
                        <div className="prose prose-invert prose-lg max-w-none">
                            <ReactMarkdown>{insights}</ReactMarkdown>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-6 py-10">
                            <BrainCircuit className="w-16 h-16 opacity-20" />
                            <p className="text-xl">Click "Analyze Weaknesses" to generate a teacher's report based on current statistics.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
      )}
    </div>
  );
};