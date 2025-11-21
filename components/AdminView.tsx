
import React, { useState, useEffect, useMemo } from 'react';
import { getAdminStatsForSet, getQuizSets, resetAdminStats, getAdminWhitelist, addAdmin, removeAdmin, getAttemptsBySet } from '../services/storage';
import { AdminQuestionStats, QuizSet, UserProfile, AttemptResult } from '../types';
import { QuizEditor } from './QuizEditor';
import { RefreshCw, FileBarChart, Settings, BookOpen, UserPlus, X, History, Search, ChevronRight, AlertTriangle, CheckCircle2, User, TrendingUp, AlertOctagon, Users } from 'lucide-react';

interface AdminViewProps {
    user: UserProfile;
}

type AdminMode = 'INSIGHTS' | 'CONTENT' | 'USERS' | 'TRACE';

interface StudentStat {
    email: string;
    name: string;
    attempts: number;
    passes: number;
    averageScore: number;
    lastActive: number;
}

export const AdminView: React.FC<AdminViewProps> = ({ user }) => {
  const [mode, setMode] = useState<AdminMode>('INSIGHTS');
  const [selectedSetId, setSelectedSetId] = useState<string>('');
  const [stats, setStats] = useState<AdminQuestionStats[]>([]);
  const [quizSets, setQuizSets] = useState<QuizSet[]>([]);
  
  // Trace Mode State
  const [allAttempts, setAllAttempts] = useState<AttemptResult[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<AttemptResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
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
          
          // Load detailed attempts for Trace Mode
          const attempts = getAttemptsBySet(selectedSetId);
          setAllAttempts(attempts.sort((a, b) => b.timestamp - a.timestamp));
          setSelectedAttempt(null);
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

  // --- Data Processing Helpers ---

  // 1. Chart Data
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

  // 2. Trace Filter
  const filteredAttempts = allAttempts.filter(a => {
      const term = searchQuery.toLowerCase();
      const uName = a.userName?.toLowerCase() || '';
      const uEmail = a.userId?.toLowerCase() || '';
      return uName.includes(term) || uEmail.includes(term);
  });

  // 3. Student Aggregation (New Tool)
  const studentStats = useMemo(() => {
      const map: Record<string, StudentStat> = {};
      allAttempts.forEach(a => {
          const uid = a.userId || 'anonymous';
          if (!map[uid]) {
              map[uid] = {
                  email: uid,
                  name: a.userName || 'Anonymous',
                  attempts: 0,
                  passes: 0,
                  averageScore: 0,
                  lastActive: 0
              };
          }
          
          map[uid].attempts++;
          if (a.isCompleteSuccess) map[uid].passes++;
          map[uid].lastActive = Math.max(map[uid].lastActive, a.timestamp);
          
          // Calculate Score % for this attempt
          let correct = 0;
          let total = 0;
          Object.values(a.areaScores).forEach((s: any) => {
              correct += s.correct;
              total += s.total;
          });
          const score = total > 0 ? (correct / total) * 100 : 0;
          
          // Running average approximation
          const currentTotal = map[uid].averageScore * (map[uid].attempts - 1);
          map[uid].averageScore = (currentTotal + score) / map[uid].attempts;
      });
      return Object.values(map).sort((a, b) => a.averageScore - b.averageScore); // Lowest scores first (At Risk)
  }, [allAttempts]);

  // 4. Distractor Analysis (New Tool)
  const problematicQuestions = useMemo(() => {
      return stats.filter(s => s.errorCount > 0).map(s => {
          // Find the most chosen wrong answer
          let topWrongOptId = '';
          let maxCount = 0;
          Object.entries(s.wrongOptionsDistribution).forEach(([optId, val]) => {
              const count = val as number;
              if (count > maxCount) {
                  maxCount = count;
                  topWrongOptId = optId;
              }
          });
          
          // If the top wrong answer accounts for > 40% of errors, it's a significant distractor
          const isDistractor = s.errorCount > 2 && (maxCount / s.errorCount) > 0.4;
          
          return {
              ...s,
              topWrongOptId,
              topWrongCount: maxCount,
              isDistractor
          };
      }).filter(item => item.isDistractor).sort((a, b) => b.topWrongCount - a.topWrongCount);
  }, [stats]);


  // Helpers for text lookup
  const getQuestionText = (qId: string) => {
      const set = quizSets.find(s => s.id === selectedSetId);
      if (!set) return "Unknown Question";
      const q = set.questions.find(q => q.id === qId);
      return q ? q.text : "Deleted Question";
  };

  const getOptionText = (qId: string, optId: string) => {
      const set = quizSets.find(s => s.id === selectedSetId);
      if (!set) return "Unknown Option";
      const q = set.questions.find(q => q.id === qId);
      if (!q) return "Deleted Question";
      const opt = q.options.find(o => o.id === optId);
      return opt ? opt.text : "Unknown Option";
  };
  
  const getCorrectOptionId = (qId: string) => {
      const set = quizSets.find(s => s.id === selectedSetId);
      const q = set?.questions.find(q => q.id === qId);
      return q?.correctOptionId;
  };

  if (mode === 'CONTENT') {
      return <QuizEditor user={user} onBack={() => setMode('INSIGHTS')} />;
  }

  return (
    <div className="space-y-10 pb-20 relative">
      {/* Admin Nav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-slate-200 pb-6">
        <div>
            <h2 className="text-4xl font-bold text-slate-800">Admin Dashboard</h2>
            <p className="text-slate-500 mt-2 text-lg">Welcome, {user.name}</p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-xl overflow-x-auto">
            <button 
                onClick={() => setMode('INSIGHTS')}
                className={`px-4 sm:px-6 py-3 rounded-lg text-base font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${mode === 'INSIGHTS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <TrendingUp className="w-5 h-5" /> Analysis
            </button>
            <button 
                onClick={() => setMode('TRACE')}
                className={`px-4 sm:px-6 py-3 rounded-lg text-base font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${mode === 'TRACE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <History className="w-5 h-5" /> Logs
            </button>
            <button 
                onClick={() => setMode('CONTENT')}
                className="px-4 sm:px-6 py-3 rounded-lg text-base font-bold transition-colors flex items-center gap-2 text-slate-500 hover:text-slate-700 whitespace-nowrap"
            >
                <BookOpen className="w-5 h-5" /> Editor
            </button>
            <button 
                onClick={() => setMode('USERS')}
                className={`px-4 sm:px-6 py-3 rounded-lg text-base font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${mode === 'USERS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
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

      {(mode === 'INSIGHTS' || mode === 'TRACE') && (
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
                <label className="text-lg font-bold text-slate-500 hidden sm:block">Viewing Set:</label>
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
            {mode === 'INSIGHTS' && (
                <button 
                    onClick={handleResetData}
                    className="text-slate-500 hover:text-rose-600 flex items-center gap-2 text-base font-medium transition-colors"
                >
                    <RefreshCw className="w-5 h-5" /> Reset Data
                </button>
            )}
        </div>
      )}

      {mode === 'INSIGHTS' && (
            <div className="space-y-8">
                {/* 1. Graph Section */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col">
                    <h3 className="font-bold text-slate-700 text-xl mb-8 flex items-center gap-3">
                        <FileBarChart className="w-6 h-6 text-indigo-600" />
                        Error Frequency by Question Sequence
                    </h3>
                    
                    {chartData.length > 0 ? (
                        <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
                            <div 
                                className="h-[400px] flex items-end gap-2 p-4 border-b border-l border-slate-200 pt-10"
                                style={{ minWidth: `${Math.max(100, chartData.length * 50)}px` }}
                            >
                                {chartData.map((item) => {
                                    const heightPercentage = (item.errors / maxErrors) * 100;
                                    const isHighRisk = item.errorRate > 50;
                                    return (
                                        <div key={item.id} className="flex-1 flex flex-col items-center group relative" style={{ minWidth: '30px' }}>
                                            {/* Tooltip */}
                                            <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs rounded-lg p-2 w-48 z-10 pointer-events-none left-1/2 -translate-x-1/2 shadow-lg">
                                                <div className="font-bold">{item.name}</div>
                                                <div>{item.questionText.substring(0, 50)}...</div>
                                                <div className="mt-1 pt-1 border-t border-slate-600 flex justify-between">
                                                    <span>Errors:</span>
                                                    <span className="font-bold">{item.errors}/{item.attempts}</span>
                                                </div>
                                            </div>
                                            
                                            {/* Bar with Number Label */}
                                            <div 
                                                style={{ height: `${Math.max(heightPercentage, 2)}%` }} 
                                                className={`w-full rounded-t-md transition-all duration-300 relative ${isHighRisk ? 'bg-rose-500 hover:bg-rose-600' : 'bg-indigo-500 hover:bg-indigo-600'}`}
                                            >
                                                {/* Explicit Error Count Label above bar */}
                                                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-600">
                                                    {item.errors > 0 ? item.errors : ''}
                                                </span>
                                            </div>
                                            
                                            {/* Label */}
                                            <div className="text-xs text-slate-500 font-bold mt-2 whitespace-nowrap">{item.name}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="h-[200px] w-full flex items-center justify-center text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            No attempts recorded yet.
                        </div>
                    )}
                    <div className="mt-4 text-sm text-center text-slate-400">
                       Numbers above bars indicate total error count.
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* 2. Common Misconceptions (New Tool) */}
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col h-[500px]">
                        <h3 className="font-bold text-slate-700 text-xl mb-6 flex items-center gap-3">
                            <AlertOctagon className="w-6 h-6 text-rose-500" />
                            Common Misconceptions
                        </h3>
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                            {problematicQuestions.length > 0 ? (
                                problematicQuestions.map((q) => (
                                    <div key={q.questionId} className="p-5 rounded-xl bg-rose-50 border border-rose-100">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold bg-rose-200 text-rose-800 px-2 py-1 rounded">Q{q.originalIndex}</span>
                                            <span className="text-xs font-bold text-rose-600">
                                                {Math.round((q.topWrongCount / q.errorCount) * 100)}% of errors
                                            </span>
                                        </div>
                                        <p className="text-slate-800 text-sm font-medium mb-3 line-clamp-2">{q.questionText}</p>
                                        <div className="bg-white p-3 rounded-lg text-sm border border-rose-200">
                                            <span className="text-slate-400 font-bold block text-xs uppercase mb-1">Students mistakenly chose:</span>
                                            <span className="text-rose-700 font-semibold">{getOptionText(q.questionId, q.topWrongOptId)}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-slate-400 text-center py-10">
                                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                    <p>No specific distractors identified yet.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. Student Performance Matrix (New Tool) */}
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col h-[500px]">
                        <h3 className="font-bold text-slate-700 text-xl mb-6 flex items-center gap-3">
                            <Users className="w-6 h-6 text-indigo-600" />
                            Student Performance Matrix
                        </h3>
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-bold uppercase sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 rounded-tl-lg">Student</th>
                                        <th className="px-4 py-3">Avg Score</th>
                                        <th className="px-4 py-3 rounded-tr-lg">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {studentStats.map((stat) => (
                                        <tr key={stat.email} className="hover:bg-slate-50">
                                            <td className="px-4 py-4">
                                                <div className="font-bold text-slate-700">{stat.name}</div>
                                                <div className="text-xs text-slate-400">{stat.email}</div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full ${stat.averageScore > 70 ? 'bg-emerald-500' : stat.averageScore > 40 ? 'bg-amber-400' : 'bg-rose-500'}`} 
                                                            style={{ width: `${stat.averageScore}%` }}
                                                        />
                                                    </div>
                                                    <span className="font-bold text-slate-600">{Math.round(stat.averageScore)}%</span>
                                                </div>
                                                <div className="text-xs text-slate-400 mt-1">{stat.attempts} Attempts</div>
                                            </td>
                                            <td className="px-4 py-4">
                                                {stat.passes > 0 ? (
                                                    <span className="inline-block px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md font-bold text-xs">Passed</span>
                                                ) : (
                                                    <span className="inline-block px-2 py-1 bg-amber-100 text-amber-700 rounded-md font-bold text-xs">Reviewing</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {studentStats.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="text-center py-10 text-slate-400">No student data available.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
      )}

      {mode === 'TRACE' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-8 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                <h3 className="font-bold text-slate-700 text-xl flex items-center gap-3">
                    <History className="w-6 h-6 text-indigo-600" />
                    Individual Attempt Logs
                </h3>
                <div className="relative w-full sm:w-auto">
                    <input 
                        type="text" 
                        placeholder="Search by user name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-80"
                    />
                    <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
                </div>
            </div>

            {filteredAttempts.length === 0 ? (
                <div className="p-20 text-center text-slate-400">
                    <div className="inline-flex p-4 bg-slate-50 rounded-full mb-4">
                        <History className="w-8 h-8" />
                    </div>
                    <p className="text-lg font-medium">No attempt logs found matching your criteria.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold text-sm uppercase tracking-wider">
                            <tr>
                                <th className="px-8 py-4">Date</th>
                                <th className="px-8 py-4">User</th>
                                <th className="px-8 py-4">Result</th>
                                <th className="px-8 py-4 text-right">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredAttempts.map((attempt, idx) => {
                                // Calculate total correct
                                let totalCorrect = 0;
                                let totalQs = 0;
                                Object.values(attempt.areaScores).forEach((score: any) => {
                                    totalCorrect += score.correct;
                                    totalQs += score.total;
                                });
                                
                                return (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-8 py-6 whitespace-nowrap text-slate-600">
                                            {new Date(attempt.timestamp).toLocaleString()}
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                                    {attempt.userName ? attempt.userName.charAt(0).toUpperCase() : <User className="w-4 h-4"/>}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800">{attempt.userName || 'Anonymous'}</div>
                                                    <div className="text-xs text-slate-400">{attempt.userId || 'No Email'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${attempt.isCompleteSuccess ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {attempt.isCompleteSuccess ? 'PASSED' : 'REVIEW'}
                                                </span>
                                                <span className="text-sm font-medium text-slate-600">
                                                    {totalCorrect} / {totalQs} Correct
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button 
                                                onClick={() => setSelectedAttempt(attempt)}
                                                className="text-indigo-600 font-bold text-sm hover:underline inline-flex items-center gap-1"
                                            >
                                                Trace <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      )}

      {/* Trace Details Modal */}
      {selectedAttempt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
                  <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                      <div>
                          <h4 className="font-bold text-xl text-slate-800">Attempt Detail Trace</h4>
                          <p className="text-slate-500 text-sm mt-1">
                              {selectedAttempt.userName} • {new Date(selectedAttempt.timestamp).toLocaleString()}
                          </p>
                      </div>
                      <button onClick={() => setSelectedAttempt(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                          <X className="w-6 h-6" />
                      </button>
                  </div>
                  
                  <div className="overflow-y-auto p-6 space-y-6">
                      {Object.entries(selectedAttempt.answers).map(([qId, selectedOptId], index) => {
                          const sOptId = selectedOptId as string;
                          const correctOptId = getCorrectOptionId(qId);
                          const isCorrect = sOptId === correctOptId;
                          
                          return (
                              <div key={qId} className={`p-4 rounded-xl border ${isCorrect ? 'border-emerald-100 bg-emerald-50/30' : 'border-rose-100 bg-rose-50/30'}`}>
                                  <div className="flex items-start gap-3 mb-3">
                                      <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${isCorrect ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                                          {index + 1}
                                      </span>
                                      <p className="font-medium text-slate-800">{getQuestionText(qId)}</p>
                                  </div>
                                  
                                  <div className="ml-9 space-y-2 text-sm">
                                      <div className="flex items-center gap-2">
                                          <span className="text-slate-500 font-bold w-20">User Chose:</span>
                                          <span className={`px-2 py-1 rounded font-medium ${isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                              {getOptionText(qId, sOptId)}
                                          </span>
                                          {!isCorrect && <AlertTriangle className="w-4 h-4 text-rose-500" />}
                                      </div>
                                      {!isCorrect && (
                                          <div className="flex items-center gap-2">
                                              <span className="text-slate-500 font-bold w-20">Correct:</span>
                                              <span className="px-2 py-1 rounded font-medium bg-emerald-100 text-emerald-700">
                                                  {getOptionText(qId, correctOptId || '')}
                                              </span>
                                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                          </div>
                                      )}
                                  </div>
                              </div>
                          );
                      })}
                  </div>

                  <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end">
                      <button 
                          onClick={() => setSelectedAttempt(null)}
                          className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition-colors"
                      >
                          Close Trace
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
