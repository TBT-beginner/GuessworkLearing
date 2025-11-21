
import React, { useState, useEffect } from 'react';
import { QuizSet, AttemptResult, MAX_ATTEMPTS } from '../types';
import { getQuizSets, getAttempts } from '../services/storage';
import { BookOpen, CheckCircle2, Clock, ChevronRight, Lock } from 'lucide-react';

interface QuizSetSelectorProps {
  onSelect: (set: QuizSet) => void;
}

export const QuizSetSelector: React.FC<QuizSetSelectorProps> = ({ onSelect }) => {
  const [sets, setSets] = useState<QuizSet[]>([]);
  const [attempts, setAttempts] = useState<AttemptResult[]>([]);

  useEffect(() => {
    setSets(getQuizSets());
    setAttempts(getAttempts());
  }, []);

  return (
    <div className="w-full mx-auto pb-20">
      <div className="mb-10">
        <h2 className="text-4xl font-bold text-slate-800">My Learning Path</h2>
        <p className="text-slate-500 mt-2 text-xl">Select a problem set to begin your deduction challenge.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
        {sets.map((set) => {
          const setAttempts = attempts.filter(a => a.quizSetId === set.id);
          const isPassed = setAttempts.some(a => a.isCompleteSuccess);
          const attemptsUsed = setAttempts.length;
          // A set is "Review Locked" if max attempts reached and not passed.
          const isReviewLocked = attemptsUsed >= MAX_ATTEMPTS && !isPassed;

          return (
            <div 
              key={set.id} 
              className={`
                group relative bg-white rounded-3xl p-8 border-2 transition-all duration-300 cursor-pointer hover:shadow-xl
                ${isReviewLocked 
                    ? 'border-slate-300 bg-slate-50/60 hover:border-rose-300' 
                    : 'border-slate-200 hover:border-indigo-300'
                }
              `}
              onClick={() => onSelect(set)}
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                    isPassed ? 'bg-emerald-100 text-emerald-600' : 
                    isReviewLocked ? 'bg-rose-100 text-rose-500' :
                    'bg-indigo-50 text-indigo-600'
                }`}>
                  {isPassed ? <CheckCircle2 className="w-8 h-8" /> : 
                   isReviewLocked ? <Lock className="w-7 h-7" /> :
                   <BookOpen className="w-8 h-8" />
                  }
                </div>
                <div className="flex flex-col items-end">
                    <span className={`text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-full ${
                        isPassed ? 'bg-emerald-100 text-emerald-700' :
                        isReviewLocked ? 'bg-rose-100 text-rose-700' :
                        'bg-slate-100 text-slate-600'
                    }`}>
                        {isPassed ? 'COMPLETED' : isReviewLocked ? 'REVIEW LOCKED' : 'AVAILABLE'}
                    </span>
                </div>
              </div>

              <h3 className={`text-2xl font-bold mb-3 transition-colors ${isReviewLocked ? 'text-slate-600 group-hover:text-rose-600' : 'text-slate-800 group-hover:text-indigo-600'}`}>
                {set.title}
              </h3>
              <p className="text-slate-500 text-lg mb-8 line-clamp-3 leading-relaxed">
                {set.description}
              </p>

              <div className="flex items-center justify-between text-base pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2 text-slate-500 font-medium">
                    <Clock className="w-5 h-5" />
                    <span>{attemptsUsed}/{MAX_ATTEMPTS} Tries</span>
                </div>
                <span className={`font-bold text-lg flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isReviewLocked ? 'text-rose-500' : 'text-indigo-600'}`}>
                   {isReviewLocked ? 'Unlock' : 'Start'} <ChevronRight className="w-5 h-5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
