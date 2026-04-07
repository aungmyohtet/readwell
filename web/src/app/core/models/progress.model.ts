export interface ProgressRecord {
  id: string;
  userId: string;
  storyId: string;
  storyTitle: string;
  chapterId: string;
  chapterTitle: string;
  chapterNumber: number;
  score: number;
  totalQuestions: number;
  completedAt: string;
}

export interface QuestionAttemptRequest {
  questionOrder: number;
  selectedAnswer: string;
}

export interface GrammarWeakness {
  grammarRule: string;
  missCount: number;
  chapterCount: number;
}

export interface ReviewRecommendation {
  storyId: string;
  storyTitle: string;
  chapterId: string;
  chapterTitle: string;
  chapterNumber: number;
  grammarRule: string;
  lastScorePct: number;
  reason: string;
}

export interface MistakeBankItem {
  storyId: string;
  storyTitle: string;
  chapterId: string;
  chapterTitle: string;
  chapterNumber: number;
  grammarRule: string;
  questionOrder: number;
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
}
