
import React, { useState, useMemo, useEffect } from 'react';
import { MAX_ATTEMPTS, AttemptResult, Question, QuizSet, UserProfile } from '../types';
import { submitAttempt } from '../services/quizService';
import { getAttemptsBySet } from '../services/storage';
import { AlertCircle, CheckCircle2, PlayCircle, Award, ArrowLeft, Lightbulb, Languages, Lock, Unlock, KeyRound, User } from 'lucide-react';

interface LearnerViewProps {
  quizSet: QuizSet;
  currentUser: UserProfile;
  onBack: () => void;
}

// Lightweight Markdown Parser Component
const SimpleMarkdown: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;
  
  // Split by double newlines for paragraphs, or <br> tags
  const paragraphs = content.split(/(\n\n|<br\s*\/?>)/g).filter(p => p.trim().length > 0 && !p.match(/^<br\s*\/?>$/));

  const parseInline = (text: string) => {
    // Split by bold (**text**) and italic (*text*) markers
    // This regex captures the delimiters and content
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-indigo-900">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i} className="italic">{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  return (
    <div className="space-y-3 text-slate-800 text-lg leading-relaxed">
      {paragraphs.map((paragraph, idx) => {
        // Handle bullet lists roughly
        if (paragraph.trim().startsWith('- ')) {
            const items = paragraph.split('\n').filter(line => line.trim().startsWith('- '));
            return (
                <ul key={idx} className="list-disc list-inside mb-2 space-y-1">
                    {items.map((item, i) => (
                        <li key={i}>{parseInline(item.replace(/^- /, ''))}</li>
                    ))}
                </ul>
            );
        }
        return <p key={idx}>{parseInline(paragraph)}</p>;
      })}
    </div>
  );
};

export const LearnerView: React.FC<LearnerViewProps> = ({ quizSet, currentUser, onBack }) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [attempts, setAttempts] = useState<AttemptResult[]>([]);
  const [hasPassed, setHasPassed] = useState(false);
  
  // Lock State for failed attempts
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passcodeIn, setPasscodeIn] = useState('');
  const [unlockError, setUnlockError] = useState('');

  // UI State for toggles
  const [visibleHints, setVisibleHints] = useState<Record<string, boolean>>({});
  const [visibleTranslations, setVisibleTranslations] = useState<Record<string, boolean>>({});

  // Load previous attempts for this specific set
  useEffect(() => {
    const prevAttempts = getAttemptsBySet(quizSet.id);
    // Filter attempts to show only current user's history (optional in local mode, but good practice)
    const myAttempts = prevAttempts.filter(a => !a.userId || a.userId === currentUser.email);
    setAttempts(myAttempts);
    if (myAttempts.some(a => a.isCompleteSuccess)) {
      setHasPassed(true);
    }
  }, [quizSet.id, currentUser.email]);

  const currentAttemptNum = attempts.length + 1;
  const isFinished = attempts.length >= MAX_ATTEMPTS || hasPassed;
  
  // Determine visibility of answers/explanations
  // If passed, always show.
  // If failed but unlocked, show.
  // If failed and locked, hide.
  const showAnswers = (isFinished && hasPassed) || (isFinished && isUnlocked);
  const isLockedState = isFinished && !hasPassed && !isUnlocked;

  const questionsByArea = useMemo(() => {
    const groups: Record<string, Question[]> = {};
    quizSet.questions.forEach(q => {
      if (!groups[q.area]) groups[q.area] = [];
      groups[q.area].push(q);
    });
    return groups;
  }, [quizSet]);

  const handleOptionSelect = (questionId: string, optionId: string) => {
    if (isFinished) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const toggleHint = (qId: string) => {
    setVisibleHints(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  const toggleTranslation = (qId: string) => {
    setVisibleTranslations(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  const handleSubmit = () => {
    if (Object.keys(answers).length < quizSet.questions.length) {
      alert("Please answer all questions before submitting.");
      return;
    }

    const result = submitAttempt(quizSet.id, quizSet.questions, answers, currentAttemptNum, currentUser);
    setAttempts([...attempts, result]);

    if (result.isCompleteSuccess) {
      setHasPassed(true);
    } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  const handleUnlock = (e: React.FormEvent) => {
      e.preventDefault();
      // Use configured passcode, or fallback to a default 'teacher' if none set by admin
      const correctCode = quizSet.passcode || 'teacher'; 
      if (passcodeIn === correctCode) {
          setIsUnlocked(true);
          setUnlockError('');
      } else {
          setUnlockError('Incorrect passcode.');
      }
  };

  const lastResult = attempts.length > 0 ? attempts[attempts.length - 1] : null;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-32">
      {/* Navigation */}
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-medium text-lg">
         <ArrowLeft className="w-5 h-5" /> Back to Dashboard
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
         <h2 className="text-4xl font-bold text-slate-800">{quizSet.title}</h2>
         <p className="text-slate-500 mt-2 text-xl">{quizSet.description}</p>
      </div>

      {/* Status Banner */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col sm:flex-row justify-between items-center gap-6">
        <div>
          <h3 className="font-bold text-slate-700 text-xl">Attempt Status</h3>
          <p className="text-slate-500 text-lg">Attempt {isFinished ? attempts.length : currentAttemptNum} of {MAX_ATTEMPTS}</p>
        </div>
        
        {!isFinished && (
             <div className="flex items-center gap-3 text-indigo-600 bg-indigo-50 px-6 py-3 rounded-xl font-semibold text-lg">
             <PlayCircle className="w-6 h-6" />
             <span>In Progress</span>
           </div>
        )}
         {isFinished && hasPassed && (
           <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50 px-6 py-3 rounded-xl font-semibold text-lg">
             <Award className="w-6 h-6" />
             <span>Passed!</span>
           </div>
         )}
         {isFinished && !hasPassed && (
           <div className="flex items-center gap-3 text-rose-600 bg-rose-50 px-6 py-3 rounded-xl font-semibold text-lg">
             <AlertCircle className="w-6 h-6" />
             <span>Out of Attempts</span>
           </div>
         )}
      </div>

      {/* Review Lock Banner */}
      {isLockedState && (
          <div className="bg-slate-800 text-white p-8 rounded-2xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-8 animate-fade-in">
              <div>
                  <h3 className="text-2xl font-bold flex items-center gap-3 text-rose-300 mb-2">
                      <Lock className="w-8 h-8" />
                      Restricted Review Mode
                  </h3>
                  <p className="text-slate-300 max-w-xl text-lg">
                      Correct answers and explanations are hidden. You can review your own answers below, but you cannot change them.<br/>
                      <span className="text-white font-bold mt-2 block">Please consult your instructor for the unlock code.</span>
                  </p>
              </div>
              <form onSubmit={handleUnlock} className="bg-slate-700 p-6 rounded-xl w-full md:w-auto border border-slate-600">
                  <label className="block text-sm font-bold text-slate-400 uppercase mb-2">Teacher Code</label>
                  <div className="flex gap-2">
                      <input 
                          type="password" 
                          value={passcodeIn}
                          onChange={(e) => setPasscodeIn(e.target.value)}
                          className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none w-full"
                          placeholder="Enter code..."
                      />
                      <button type="submit" className="bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2 rounded-lg font-bold transition-colors">
                          <KeyRound className="w-5 h-5" />
                      </button>
                  </div>
                  {unlockError && <p className="text-rose-400 text-sm mt-2 font-medium">{unlockError}</p>}
              </form>
          </div>
      )}

      {/* Review Unlocked Banner */}
      {isFinished && isUnlocked && !hasPassed && (
          <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-lg flex items-center gap-4 animate-fade-in">
              <div className="p-3 bg-indigo-800 rounded-full">
                  <Unlock className="w-6 h-6 text-indigo-300" />
              </div>
              <div>
                  <h3 className="text-xl font-bold text-white">Review Mode Unlocked</h3>
                  <p className="text-indigo-200">Correct answers and explanations are now visible.</p>
              </div>
          </div>
      )}

      {/* Feedback Area (Only show area scores if valid, keep showing scores even if locked so they know WHERE they failed) */}
      {lastResult && !hasPassed && !isFinished && (
        <div className="bg-amber-50 border-l-8 border-amber-400 p-8 rounded-r-xl shadow-sm">
          <h3 className="font-bold text-amber-800 text-2xl mb-3 flex items-center gap-3">
            <AlertCircle className="w-7 h-7" />
            Feedback (Attempt {lastResult.attemptNumber})
          </h3>
          <p className="text-amber-800 mb-6 text-lg">
             Look at the area scores below. Identify which sections need review and try to deduce the correct answers.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {Object.entries(lastResult.areaScores).map(([area, score]: [string, { correct: number; total: number }]) => (
              <div key={area} className={`p-5 rounded-xl border-2 ${score.correct === score.total ? 'bg-emerald-100 border-emerald-200' : 'bg-white border-amber-200'}`}>
                <div className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-2">{area}</div>
                <div className={`text-3xl font-bold ${score.correct === score.total ? 'text-emerald-700' : 'text-amber-600'}`}>
                  {score.correct} <span className="text-lg text-slate-400">/ {score.total}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quiz Content */}
      <div className="space-y-12">
        {(Object.entries(questionsByArea) as [string, Question[]][]).map(([area, questions]) => (
          <div key={area} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-8 py-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-700 uppercase tracking-wide text-lg">{area}</h3>
                    {/* Only show perfect badge if we are allowing full review or valid attempt */}
                    {lastResult && lastResult.areaScores[area] && lastResult.areaScores[area].correct === lastResult.areaScores[area].total && (
                        <span className="text-sm bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-bold flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" /> Perfect previously
                        </span>
                    )}
                </div>
            </div>
            <div className="divide-y divide-slate-100">
              {questions.map((q, idx) => {
                  const isCorrectFinal = isFinished && answers[q.id] === q.correctOptionId;

                  return (
                    <div key={q.id} className={`p-8 transition-colors ${showAnswers ? (isCorrectFinal ? 'bg-emerald-50/30' : 'bg-rose-50/30') : ''}`}>
                    <div className="flex gap-6">
                        <span className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-lg">
                            {idx + 1}
                        </span>
                        <div className="flex-1">
                            <div className="mb-6">
                                <p className="text-2xl font-medium text-slate-900 leading-snug">
                                    {q.text}
                                </p>
                                
                                {/* Toggles */}
                                <div className="flex gap-3 mt-3">
                                    {q.translation && (
                                        <button 
                                            onClick={() => toggleTranslation(q.id)}
                                            className={`text-sm font-bold px-3 py-1.5 rounded-full flex items-center gap-2 transition-colors ${visibleTranslations[q.id] ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                        >
                                            <Languages className="w-4 h-4" /> 
                                            {visibleTranslations[q.id] ? 'Hide JP' : 'JP Translation'}
                                        </button>
                                    )}
                                    {q.hint && !isFinished && (
                                        <button 
                                            onClick={() => toggleHint(q.id)}
                                            className={`text-sm font-bold px-3 py-1.5 rounded-full flex items-center gap-2 transition-colors ${visibleHints[q.id] ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                        >
                                            <Lightbulb className="w-4 h-4" /> 
                                            {visibleHints[q.id] ? 'Hide Hint' : 'Hint'}
                                        </button>
                                    )}
                                </div>

                                {/* Toggle Content */}
                                {visibleTranslations[q.id] && q.translation && (
                                    <div className="mt-3 p-3 bg-indigo-50/50 rounded-lg text-indigo-900 font-medium animate-fade-in">
                                        {q.translation}
                                    </div>
                                )}
                                {visibleHints[q.id] && q.hint && !isFinished && (
                                    <div className="mt-3 p-3 bg-amber-50/50 rounded-lg text-amber-900 font-medium animate-fade-in flex items-start gap-2">
                                        <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                        <span>{q.hint}</span>
                                    </div>
                                )}
                            </div>
                        
                        <div className="space-y-4">
                            {q.options.map((opt) => {
                                // Conditional Styling logic
                                let borderClass = 'border-slate-200 hover:border-slate-300 hover:bg-slate-50';
                                let bgClass = '';
                                let ringClass = '';
                                let textClass = 'text-slate-700';
                                let radioColor = 'border-slate-300';
                                let radioFill = null;

                                const isSelected = answers[q.id] === opt.id;
                                const isCorrectOption = q.correctOptionId === opt.id;

                                // Base selection style
                                if (isSelected) {
                                    borderClass = 'border-indigo-600 bg-indigo-50';
                                    textClass = 'text-indigo-900';
                                    radioColor = 'border-indigo-600';
                                    radioFill = <div className="w-3 h-3 rounded-full bg-indigo-600" />;
                                }

                                // Locked State (Show user selection explicitly, but DO NOT show correct/incorrect)
                                if (isLockedState) {
                                     if (isSelected) {
                                         borderClass = 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-200'; // Highlight selection
                                         textClass = 'text-indigo-900 font-bold';
                                     } else {
                                         borderClass = 'border-slate-100 bg-slate-50/50 opacity-60'; // Fade others
                                         textClass = 'text-slate-400';
                                     }
                                } 
                                // Unlocked / Passed / Active State
                                else if (showAnswers) {
                                    if (isCorrectOption) {
                                        borderClass = '!border-emerald-500 !bg-emerald-100';
                                        ringClass = 'ring-2 ring-emerald-200 ring-offset-2';
                                        textClass = 'text-emerald-900';
                                    }
                                    if (isSelected && !isCorrectOption) {
                                        borderClass = '!border-rose-500 !bg-rose-100';
                                        textClass = 'text-rose-900';
                                    }
                                }

                                return (
                                    <label
                                        key={opt.id}
                                        className={`
                                        relative flex items-center p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200
                                        ${borderClass} ${bgClass} ${ringClass}
                                        `}
                                    >
                                        <input
                                        type="radio"
                                        name={q.id}
                                        value={opt.id}
                                        checked={isSelected}
                                        onChange={() => handleOptionSelect(q.id, opt.id)}
                                        disabled={isFinished}
                                        className="sr-only"
                                        />
                                        <div className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center flex-shrink-0 ${radioColor} ${isLockedState && !isSelected ? 'opacity-50' : ''}`}>
                                            {radioFill}
                                        </div>
                                        <div className="flex-1">
                                            <span className={`font-medium text-xl ${textClass}`}>
                                                {opt.text}
                                            </span>
                                            {/* Explicit Label for Locked Mode */}
                                            {isLockedState && isSelected && (
                                                <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 uppercase tracking-wider mt-1">
                                                    <User className="w-3 h-3" /> Your Answer
                                                </div>
                                            )}
                                        </div>
                                    </label>
                                )
                            })}
                        </div>

                        {showAnswers && q.explanation && (
                             <div className="mt-6 p-6 bg-slate-100 rounded-xl text-slate-800 border border-slate-200 animate-fade-in">
                                <p className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-lg">
                                   <span className="w-1.5 h-5 bg-indigo-500 rounded-full inline-block"></span>
                                   Explanation:
                                </p>
                                <SimpleMarkdown content={q.explanation} />
                             </div>
                        )}
                        </div>
                    </div>
                    </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {!isFinished && (
         <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40">
            <div className="max-w-6xl mx-auto flex justify-between items-center">
                <div className="text-lg text-slate-500 hidden sm:block font-medium">
                    {Object.keys(answers).length} / {quizSet.questions.length} Answered
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={Object.keys(answers).length < quizSet.questions.length}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-10 py-4 rounded-xl font-bold text-xl shadow-lg shadow-indigo-200 transition-all transform active:scale-95 w-full sm:w-auto"
                >
                    Submit Attempt {currentAttemptNum}
                </button>
            </div>
         </div>
      )}
    </div>
  );
};
