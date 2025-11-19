
export enum UserRole {
  LEARNER = 'LEARNER',
  ADMIN = 'ADMIN',
}

export interface UserProfile {
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface Option {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  text: string;
  options: Option[];
  correctOptionId: string;
  area: string; // Dynamic string, allows admin to define new areas
  explanation?: string;
  hint?: string;
  translation?: string;
}

export interface QuizSet {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  createdAt: number;
  createdBy: string; // email
}

export interface UserAnswer {
  questionId: string;
  selectedOptionId: string;
}

export interface AttemptResult {
  attemptNumber: number;
  quizSetId: string;
  areaScores: Record<string, { correct: number; total: number }>;
  isCompleteSuccess: boolean;
  answers: Record<string, string>; // questionId -> optionId
  timestamp: number;
}

export interface AdminQuestionStats {
  questionId: string;
  questionText: string;
  originalIndex: number; // Question number in the quiz (1-based)
  area: string;
  errorCount: number;
  totalAttempts: number;
  wrongOptionsDistribution: Record<string, number>; // optionId -> count
}

export const MAX_ATTEMPTS = 3;