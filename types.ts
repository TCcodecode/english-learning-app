export interface SentenceCard {
  id: number;
  chinese: string;
  english: string;
  memoryLevel: number;
  lastReviewed: number | null;
  nextReview: number;
  incorrectAnswers: string[];
  isSkipped: boolean;
  correctStreak: number;
}

export interface StudyBook {
  id: string;
  title: string;
  cards: SentenceCard[];
  createdAt: number;
}

export interface WordCard {
  id: number;
  word: string;
  chinese: string;
  memoryLevel: number;
  lastReviewed: number | null;
  nextReview: number;
  correctStreak: number;
}

export interface WordBook {
    id: string;
    title: string;
    cards: WordCard[];
}


export enum View {
  Library = 'LIBRARY',
  StudySession = 'STUDY_SESSION',
  WordBook = 'WORD_BOOK_STUDY',
  BookDetail = 'BOOK_DETAIL',
}

export enum StudyMode {
  Learn = 'LEARN',
  ReviewMistakes = 'REVIEW_MISTAKES',
}

export enum AnswerMode {
  Fixed = 'FIXED',
  AI = 'AI',
}