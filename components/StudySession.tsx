
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StudyBook, SentenceCard, StudyMode, AnswerMode } from '../types';
import { processAnswer } from '../services/ebbinghausService';
import { judgeTranslation, extractWords } from '../services/geminiService';
import { FixedWordInput } from './FixedWordInput';
import { CheckIcon, XIcon, ArrowRightIcon, SparklesIcon, ArrowLeftIcon } from './Icons';

interface Props {
  book: StudyBook;
  mode: StudyMode;
  onSessionEnd: (updatedBook: StudyBook) => void;
  onAddToWordBook: (words: { word: string; chinese: string }[]) => void;
}

export const StudySession: React.FC<Props> = ({ book, mode, onSessionEnd, onAddToWordBook }) => {
  const [studyQueue, setStudyQueue] = useState<SentenceCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerState, setAnswerState] = useState<'answering' | 'correct' | 'incorrect'>('answering');
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isJudging, setIsJudging] = useState(false);
  const [answerMode, setAnswerMode] = useState<AnswerMode>(AnswerMode.Fixed);

  useEffect(() => {
    const now = Date.now();
    let cardsToStudy: SentenceCard[];

    if (mode === StudyMode.Learn) {
      cardsToStudy = book.cards
        .filter(card => card.nextReview <= now && !card.isSkipped)
        .sort((a, b) => a.nextReview - b.nextReview);
    } else { // ReviewMistakes
      cardsToStudy = book.cards
        .filter(card => card.incorrectAnswers.length > 0)
        .sort((a, b) => (b.lastReviewed || 0) - (a.lastReviewed || 0));
    }
    setStudyQueue(cardsToStudy.slice(0, 20)); // Cap session at 20 cards
    setCurrentIndex(0);
    setAnswerState('answering');
    setUserInput('');
    setFeedback('');
  }, [book, mode]);

  const currentCard = useMemo(() => studyQueue[currentIndex], [studyQueue, currentIndex]);

  const handleEndSession = useCallback(() => {
     const updatedBookCards = book.cards.map(originalCard =>
      studyQueue.find(updatedCard => updatedCard.id === originalCard.id) || originalCard
    );
    onSessionEnd({ ...book, cards: updatedBookCards });
  }, [book, studyQueue, onSessionEnd]);
  
  const handleAnswerSubmit = useCallback(async () => {
    if (!currentCard || userInput.trim() === '' || isJudging) return;

    setIsJudging(true);
    setFeedback('');

    let isCorrect = false;
    let reason = '';

    try {
      if (answerMode === AnswerMode.AI) {
        const result = await judgeTranslation({
          chinese: currentCard.chinese,
          referenceEnglish: currentCard.english,
          userInput: userInput,
        });
        isCorrect = result.isCorrect;
        reason = result.reason;
      } else {
        isCorrect = userInput.trim().toLowerCase() === currentCard.english.trim().toLowerCase();
        reason = isCorrect ? 'Correct!' : `The correct answer is: ${currentCard.english}`;
      }
    } catch (error) {
      console.error("Error judging translation:", error);
      isCorrect = userInput.trim().toLowerCase() === currentCard.english.trim().toLowerCase();
      reason = isCorrect ? 'Correct!' : `AI judge failed. Expected: ${currentCard.english}`;
    }

    setAnswerState(isCorrect ? 'correct' : 'incorrect');
    setFeedback(reason);

    const cardWithUserInput = { ...currentCard, userInput };
    const updatedCard = processAnswer(cardWithUserInput, isCorrect);

    if (!isCorrect) {
      extractWords(userInput, currentCard.english).then(words => {
        if (words.length > 0) {
          onAddToWordBook(words);
        }
      });
    }

    setStudyQueue(prevQueue => {
      const newQueue = [...prevQueue];
      newQueue[currentIndex] = updatedCard;
      return newQueue;
    });

    setIsJudging(false);
  }, [currentCard, userInput, isJudging, answerMode, onAddToWordBook, currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < studyQueue.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setUserInput('');
      setAnswerState('answering');
      setFeedback('');
    } else {
      handleEndSession();
    }
  }, [currentIndex, studyQueue.length, handleEndSession]);
  
  const handleSkip = useCallback(() => {
     if (currentIndex < studyQueue.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleEndSession();
    }
  }, [currentIndex, studyQueue.length, handleEndSession]);


  if (studyQueue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
        <h2 className="text-2xl font-bold text-text-primary mb-4">
          {mode === StudyMode.Learn ? "You're all caught up!" : "No mistakes to review!"}
        </h2>
        <p className="text-text-secondary mb-8">
          {mode === StudyMode.Learn ? "No cards are due for review right now." : "Good job keeping your mistake list clear!"}
        </p>
        <button onClick={() => onSessionEnd(book)} className="bg-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-indigo-500 transition-colors">
          Back to Library
        </button>
      </div>
    );
  }

  if (!currentCard) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const progress = ((currentIndex + 1) / studyQueue.length) * 100;

  return (
    <div className="flex flex-col min-h-screen bg-background text-text-primary p-4 sm:p-6 lg:p-8">
      <header className="flex items-center justify-between mb-4 sm:mb-8">
        <button onClick={handleEndSession} className="flex items-center text-text-secondary hover:text-text-primary transition-colors p-2 -ml-2">
          <ArrowLeftIcon /> <span className="ml-1">End Session</span>
        </button>
        <div className="text-sm font-semibold bg-surface px-3 py-1 rounded-full">
          {currentIndex + 1} / {studyQueue.length}
        </div>
      </header>

      <div className="w-full bg-surface rounded-full h-2 mb-8">
        <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
      </div>

      <main className="flex-grow flex flex-col items-center justify-center w-full max-w-3xl mx-auto">
        <div className="w-full text-center">
          <div className="mb-8 p-6 bg-surface rounded-lg shadow-lg min-h-[120px] flex items-center justify-center">
            <p className="text-3xl lg:text-4xl font-semibold text-text-primary tracking-wide leading-relaxed">{currentCard.chinese}</p>
          </div>

          <div className="mb-6">
            {answerMode === AnswerMode.Fixed ? (
              <FixedWordInput
                sentence={currentCard.english}
                onAnswerChange={setUserInput}
                onSubmit={handleAnswerSubmit}
                disabled={answerState !== 'answering' || isJudging}
              />
            ) : (
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (answerState === 'answering') handleAnswerSubmit();
                    else handleNext();
                  }
                }}
                placeholder="Type your translation here..."
                disabled={answerState !== 'answering' || isJudging}
                rows={3}
                className="w-full bg-surface border-2 border-gray-700 rounded-lg p-4 text-lg text-text-primary focus:ring-2 focus:ring-primary focus:border-primary transition-shadow disabled:bg-gray-800 disabled:text-gray-500"
              />
            )}
          </div>

          {answerState === 'answering' ? (
            <div className="flex justify-center items-center space-x-4">
              <button onClick={handleSkip} disabled={isJudging} className="px-6 py-3 rounded-lg text-text-secondary hover:bg-surface disabled:opacity-50 transition">Skip</button>
              <button
                onClick={handleAnswerSubmit}
                disabled={isJudging || userInput.trim() === ''}
                className="px-10 py-3 font-bold rounded-lg text-white bg-primary hover:bg-indigo-500 transition flex items-center justify-center disabled:bg-indigo-800 disabled:cursor-not-allowed min-w-[150px]"
              >
                {isJudging ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : 'Check'}
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={handleNext}
                className="px-10 py-3 font-bold rounded-lg text-white bg-secondary hover:bg-green-500 transition flex items-center justify-center animate-pulse"
              >
                Continue <ArrowRightIcon />
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className={`fixed bottom-0 left-0 right-0 transition-transform duration-300 ease-in-out ${answerState === 'answering' ? 'translate-y-full' : 'translate-y-0'}`} style={{ zIndex: 100 }}>
        <div className={`p-6 border-t-4 ${answerState === 'correct' ? 'bg-correct-light border-correct' : 'bg-incorrect-light border-incorrect'}`}>
          <div className="max-w-3xl mx-auto flex items-start">
            <div className={`mr-4 mt-1 p-1 rounded-full text-white ${answerState === 'correct' ? 'bg-correct' : 'bg-incorrect'}`}>
              {answerState === 'correct' ? <CheckIcon /> : <XIcon />}
            </div>
            <div className="flex-1">
              <h3 className={`text-xl font-bold ${answerState === 'correct' ? 'text-correct' : 'text-incorrect'}`}>{answerState === 'correct' ? 'Correct!' : 'Incorrect'}</h3>
              <p className="text-text-primary mt-1">{feedback}</p>
              {answerState === 'incorrect' && (
                <p className="text-text-secondary mt-2 text-sm">Correct Answer: <span className="font-semibold">{currentCard.english}</span></p>
              )}
            </div>
          </div>
        </div>
      </footer>
      
      <div className="absolute top-5 right-5 sm:top-6 sm:right-6">
        <button
          onClick={() => setAnswerMode(prev => prev === AnswerMode.AI ? AnswerMode.Fixed : AnswerMode.AI)}
          className="flex items-center space-x-2 px-3 py-2 text-sm bg-surface rounded-lg hover:bg-gray-700 transition shadow"
          title={answerMode === AnswerMode.AI ? "Switch to fixed word input" : "Switch to AI-judged free text input"}
        >
          <SparklesIcon className={`h-4 w-4 ${answerMode === AnswerMode.AI ? 'text-primary' : 'text-text-secondary'}`} />
          <span className="text-text-secondary">{answerMode === AnswerMode.AI ? 'AI Judge' : 'Word Input'}</span>
        </button>
      </div>
    </div>
  );
};
