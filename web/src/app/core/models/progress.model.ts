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

export interface SubmitProgressRequest {
  storyId: string;
  chapterId: string;
  score: number;
  totalQuestions: number;
}
