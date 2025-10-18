
import { SentenceCard, WordCard } from '../types';
import { EBBINGHAUS_INTERVALS } from '../constants';

type Card = SentenceCard | WordCard;

export const processAnswer = <T extends Card,>(card: T, isCorrect: boolean): T => {
  const now = Date.now();
  
  if (isCorrect) {
    const newMemoryLevel = Math.min(card.memoryLevel + 1, EBBINGHAUS_INTERVALS.length);
    const interval = EBBINGHAUS_INTERVALS[newMemoryLevel - 1] || EBBINGHAUS_INTERVALS[EBBINGHAUS_INTERVALS.length - 1];
    
    return {
      ...card,
      memoryLevel: newMemoryLevel,
      lastReviewed: now,
      nextReview: now + interval,
      correctStreak: card.correctStreak + 1,
    };
  } else {
    // Reset progress, but not completely to 0 if they've seen it before.
    const newMemoryLevel = Math.max(1, Math.floor(card.memoryLevel / 2));
    const interval = EBBINGHAUS_INTERVALS[newMemoryLevel - 1];
    
    const updatedCard: T = {
        ...card,
        memoryLevel: newMemoryLevel,
        lastReviewed: now,
        nextReview: now + interval,
        correctStreak: 0,
    };

    if ('incorrectAnswers' in updatedCard && 'userInput' in card) {
        (updatedCard as SentenceCard).incorrectAnswers = [...(card as SentenceCard).incorrectAnswers, (card as SentenceCard & {userInput: string}).userInput].slice(-5);
    }

    return updatedCard;
  }
};
