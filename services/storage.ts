
import { QuizSet, AttemptResult, UserProfile, AdminQuestionStats } from '../types';
import { MOCK_QUESTIONS } from '../constants';

// Simple ID generator since we can't import external libs easily in this environment
const generateId = () => Math.random().toString(36).substring(2, 15);

const STORAGE_KEYS = {
  QUIZ_SETS: 'gw_quiz_sets',
  RESULTS: 'gw_results',
  ADMIN_LIST: 'gw_admin_list',
};

// Initial Data Seeding
const DEFAULT_SET: QuizSet = {
  id: 'default_set_1',
  title: 'Standard English Proficiency',
  description: 'The classic assessment covering Grammar, Vocabulary, and Reading.',
  questions: MOCK_QUESTIONS,
  createdAt: Date.now(),
  createdBy: 'system',
};

export const getQuizSets = (): QuizSet[] => {
  const data = localStorage.getItem(STORAGE_KEYS.QUIZ_SETS);
  if (!data) {
    // Seed default
    localStorage.setItem(STORAGE_KEYS.QUIZ_SETS, JSON.stringify([DEFAULT_SET]));
    return [DEFAULT_SET];
  }
  return JSON.parse(data);
};

export const saveQuizSet = (set: QuizSet) => {
  const sets = getQuizSets();
  const existingIndex = sets.findIndex((s) => s.id === set.id);
  
  if (existingIndex >= 0) {
    sets[existingIndex] = set;
  } else {
    sets.push(set);
  }
  
  localStorage.setItem(STORAGE_KEYS.QUIZ_SETS, JSON.stringify(sets));
};

export const deleteQuizSet = (id: string) => {
  const sets = getQuizSets();
  const newSets = sets.filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEYS.QUIZ_SETS, JSON.stringify(newSets));
};

export const saveAttempt = (result: AttemptResult) => {
  const results = getAttempts();
  results.push(result);
  localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(results));
};

export const getAttempts = (): AttemptResult[] => {
  const data = localStorage.getItem(STORAGE_KEYS.RESULTS);
  return data ? JSON.parse(data) : [];
};

export const getAttemptsBySet = (quizSetId: string): AttemptResult[] => {
  return getAttempts().filter(a => a.quizSetId === quizSetId);
};

export const getAdminStatsForSet = (quizSetId: string): AdminQuestionStats[] => {
  const sets = getQuizSets();
  const targetSet = sets.find(s => s.id === quizSetId);
  if (!targetSet) return [];

  const attempts = getAttemptsBySet(quizSetId);
  
  const statsMap: Record<string, AdminQuestionStats> = {};

  // Initialize
  targetSet.questions.forEach((q, index) => {
    statsMap[q.id] = {
      questionId: q.id,
      questionText: q.text,
      originalIndex: index + 1, // Store 1-based index
      area: q.area,
      errorCount: 0,
      totalAttempts: 0,
      wrongOptionsDistribution: {}
    };
  });

  // Tally
  attempts.forEach(attempt => {
    Object.entries(attempt.answers).forEach(([qId, optionId]) => {
       const stat = statsMap[qId];
       const question = targetSet.questions.find(q => q.id === qId);
       
       if (stat && question) {
         stat.totalAttempts += 1;
         if (optionId !== question.correctOptionId) {
           stat.errorCount += 1;
           stat.wrongOptionsDistribution[optionId] = (stat.wrongOptionsDistribution[optionId] || 0) + 1;
         }
       }
    });
  });

  return Object.values(statsMap).sort((a, b) => b.errorCount - a.errorCount);
};

// Admin Management
export const getAdminWhitelist = (): string[] => {
  const data = localStorage.getItem(STORAGE_KEYS.ADMIN_LIST);
  // Default root admin
  const defaults = ['tobita@kiryo.ac.jp'];
  if (!data) return defaults;
  const parsed = JSON.parse(data);
  return Array.from(new Set([...defaults, ...parsed]));
};

export const addAdmin = (email: string) => {
  const list = getAdminWhitelist();
  if (!list.includes(email)) {
    list.push(email);
    localStorage.setItem(STORAGE_KEYS.ADMIN_LIST, JSON.stringify(list));
  }
};

export const removeAdmin = (email: string) => {
  if (email === 'tobita@kiryo.ac.jp') return; // Cannot remove root
  const list = getAdminWhitelist().filter(e => e !== email);
  localStorage.setItem(STORAGE_KEYS.ADMIN_LIST, JSON.stringify(list));
};

export const resetAdminStats = () => {
  localStorage.removeItem(STORAGE_KEYS.RESULTS);
};

export const generateUniqueId = generateId;