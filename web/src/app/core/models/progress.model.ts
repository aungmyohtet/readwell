export interface ProgressRecord {
  id: string;
  userId: string;
  storyId: string;
  storyTitle: string;
  chapterId: string;
  chapterTitle: string;
  chapterNumber: number;
  score: number;
  bestScore: number;
  previousScore?: number | null;
  attemptCount: number;
  totalQuestions: number;
  practiceScore: number;
  practiceTotal: number;
  effectiveScorePct: number;
  completedAt: string;
  nextReviewAt?: string | null;
  reviewStage?: string | null;
  masteryState?: 'needs_review' | 'stabilising' | 'mastered' | string;
}

export interface QuestionAttemptRequest {
  questionOrder: number;
  selectedAnswer: string;
}

export interface GrammarPracticeAttemptRequest {
  practiceOrder: number;
  selectedAnswer: string;
}

export interface GrammarWeakness {
  grammarRule: string;
  missCount: number;
  quizMissCount: number;
  practiceMissCount: number;
  chapterCount: number;
  focusSkillTag?: string | null;
  focusSkillLabel?: string | null;
  focusSkillMissCount?: number;
}

export interface ReviewRecommendation {
  storyId: string;
  storyTitle: string;
  chapterId: string;
  chapterTitle: string;
  chapterNumber: number;
  grammarRule: string;
  lastScorePct: number;
  nextReviewAt?: string | null;
  reviewStage?: string | null;
  reason: string;
  focusSkillTag?: string | null;
  focusSkillLabel?: string | null;
}

export interface MistakeBankItem {
  storyId: string;
  storyTitle: string;
  chapterId: string;
  chapterTitle: string;
  chapterNumber: number;
  grammarRule: string;
  questionOrder: number;
  source?: 'quiz' | 'practice' | string;
  skillTag?: string | null;
  skillLabel?: string | null;
  question: string;
  selectedAnswer: string;
  correctAnswer: string;
  explanation: string;
  completedAt: string;
}

export interface ProgressInsights {
  averageScorePct: number;
  weakAreas: GrammarWeakness[];
  reviewQueue: ReviewRecommendation[];
  mistakeBank: MistakeBankItem[];
}

export interface SubmitProgressRequest {
  storyId: string;
  chapterId: string;
  score: number;
  totalQuestions: number;
  questionAttempts: QuestionAttemptRequest[];
  grammarPracticeAttempts?: GrammarPracticeAttemptRequest[];
}

export interface RetryQuizItem {
  order: number;
  question: string;
  options: string[];
  previousAnswer: string;
  correctAnswer: string;
  explanation: string;
}

export interface RetryPracticeItem {
  order: number;
  type: 'multiple_choice' | 'fill_blank' | 'error_correction' | 'sentence_transformation';
  prompt: string;
  options?: string[];
  previousAnswer: string;
  correctAnswer: string;
  explanation: string;
  skillTag?: string | null;
}

export interface RetrySession {
  storyId: string;
  storyTitle: string;
  chapterId: string;
  chapterTitle: string;
  chapterNumber: number;
  grammarRule: string;
  quizItems: RetryQuizItem[];
  practiceItems: RetryPracticeItem[];
}

export interface SubmitRetryRequest {
  storyId: string;
  chapterId: string;
  questionAttempts?: QuestionAttemptRequest[];
  grammarPracticeAttempts?: GrammarPracticeAttemptRequest[];
}
