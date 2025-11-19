
import { Question } from './types';

export const MOCK_QUESTIONS: Question[] = [
  {
    id: 'q1',
    area: 'Grammar',
    text: 'I _____ to the store yesterday when I saw him.',
    correctOptionId: 'b',
    options: [
      { id: 'a', text: 'go' },
      { id: 'b', text: 'was going' },
      { id: 'c', text: 'have gone' },
      { id: 'd', text: 'will go' },
    ],
    explanation: 'Use the past continuous "was going" to describe an action in progress at a specific time in the past.<br><br>Since the action was interrupted by seeing him, the continuous form is required.',
    hint: 'Think about an action that was happening continuously in the past.',
    translation: '昨日彼に会ったとき、私は店へ向かっている途中でした。',
  },
  {
    id: 'q2',
    area: 'Grammar',
    text: 'She _____ play the piano since she was five.',
    correctOptionId: 'c',
    options: [
      { id: 'a', text: 'can' },
      { id: 'b', text: 'is able to' },
      { id: 'c', text: 'has been able to' },
      { id: 'd', text: 'could' },
    ],
    explanation: 'Use the present perfect "has been able to" because the action started in the past and continues to the present.',
    hint: 'The word "since" suggests an action starting in the past and continuing now.',
    translation: '彼女は5歳の頃からピアノを弾くことができます。',
  },
  {
    id: 'q3',
    area: 'Vocabulary',
    text: 'The meeting was _____ due to the storm.',
    correctOptionId: 'a',
    options: [
      { id: 'a', text: 'postponed' },
      { id: 'b', text: 'expanded' },
      { id: 'c', text: 'invited' },
      { id: 'd', text: 'rejected' },
    ],
    explanation: '"Postponed" means to arrange for something to take place at a time later than that first scheduled.',
    hint: 'Which word means "delayed" or "put off"?',
    translation: '嵐のため、会議は延期されました。',
  },
  {
    id: 'q4',
    area: 'Vocabulary',
    text: 'He made a _____ decision to quit his job.',
    correctOptionId: 'd',
    options: [
      { id: 'a', text: 'faint' },
      { id: 'b', text: 'subtle' },
      { id: 'c', text: 'vague' },
      { id: 'd', text: 'bold' },
    ],
    explanation: 'A "bold" decision involves taking risks and showing confidence.',
    hint: 'He showed courage by quitting.',
    translation: '彼は仕事を辞めるという大胆な決断をしました。',
  },
  {
    id: 'q5',
    area: 'Reading',
    text: 'Based on the context: "The nocturnal creature emerged." When did this happen?',
    correctOptionId: 'b',
    options: [
      { id: 'a', text: 'At noon' },
      { id: 'b', text: 'At night' },
      { id: 'c', text: 'In the morning' },
      { id: 'd', text: 'During lunch' },
    ],
    explanation: '"Nocturnal" refers to animals that are active at night.',
    translation: '文脈に基づくと：「夜行性の生き物が現れた」。これはいつ起きましたか？',
  },
];
