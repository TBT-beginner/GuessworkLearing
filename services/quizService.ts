
import { Question, AttemptResult, UserAnswer, AdminQuestionStats, UserProfile } from '../types';
import { saveAttempt } from './storage';

export const submitAttempt = (
  quizSetId: string,
  questions: Question[],
  answers: Record<string, string>,
  attemptNumber: number,
  user: UserProfile
): AttemptResult => {
  const areaScores: Record<string, { correct: number; total: number }> = {};
  let isCompleteSuccess = true;

  // Dynamically determine unique areas from the questions
  const uniqueAreas = Array.from(new Set(questions.map(q => q.area)));

  // Initialize areas
  uniqueAreas.forEach((area) => {
    areaScores[area] = { correct: 0, total: 0 };
  });

  questions.forEach((question) => {
    const selectedOptionId = answers[question.id];
    const isCorrect = selectedOptionId === question.correctOptionId;

    // Ensure area exists in score map (safeguard)
    if (!areaScores[question.area]) {
        areaScores[question.area] = { correct: 0, total: 0 };
    }

    areaScores[question.area].total += 1;
    if (isCorrect) {
      areaScores[question.area].correct += 1;
    } else {
      isCompleteSuccess = false;
    }
  });

  const result: AttemptResult = {
    attemptNumber,
    quizSetId,
    areaScores,
    isCompleteSuccess,
    answers,
    timestamp: Date.now(),
    userId: user.email,
    userName: user.name,
  };

  // Persist result
  saveAttempt(result);

  return result;
};

export const resetAdminStats = () => {
    // Deprecated in favor of localStorage handling in storage.ts
    localStorage.removeItem('gw_results');
}
