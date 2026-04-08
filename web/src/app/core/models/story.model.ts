export interface Story {
  id: string;
  title: string;
  description: string;
  level: 'A2' | 'B1' | 'B2';
  coverEmoji: string;
  coverImageUrl?: string;
  author: string;
  tags: string[];
  totalChapters: number;
}

export interface ChapterSummary {
  id: string;
  storyId: string;
  chapterNumber: number;
  title: string;
  vocabularyCount: number;
  comprehensionCount: number;
  completed: boolean;
  score: number;
  bestScore: number;
  previousScore?: number | null;
  attemptCount: number;
  nextReviewAt?: string | null;
  reviewStage?: string | null;
}

export interface VocabularyItem {
  word: string;
  definition: string;
  exampleSentence: string;
  emoji?: string;
}

export interface GrammarFocus {
  rule: string;
  explanation: string;
  examples: string[];
}

export interface Paragraph {
  order: number;
  text: string;
  imagePlaceholder?: string;
  imageUrl?: string;
  grammarAnnotations?: GrammarAnnotation[];
}

export interface GrammarAnnotation {
  targetText: string;
  highlightText?: string;
  tone?: 'aux' | 'ending' | 'question' | 'structure' | 'modal';
  note?: string;
  occurrence?: number;
}

export interface ComprehensionQuestion {
  order: number;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface ChapterDetail {
  id: string;
  storyId: string;
  chapterNumber: number;
  title: string;
  vocabulary: VocabularyItem[];
  grammarFocus: GrammarFocus;
  content: Paragraph[];
  comprehension: ComprehensionQuestion[];
  completed: boolean;
  score: number;
  bestScore: number;
  previousScore?: number | null;
  attemptCount: number;
  nextReviewAt?: string | null;
  reviewStage?: string | null;
}
