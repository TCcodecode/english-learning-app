import React, { useMemo } from 'react';
import { StudyBook, StudyMode } from '../types';
import { PlusIcon, BookOpenIcon, BrainIcon, TrashIcon } from './Icons';

interface Props {
  studyBooks: StudyBook[];
  onStartStudy: (bookId: string, mode: StudyMode) => void;
  onOpenCreator: () => void;
  onDeleteBook: (bookId:string) => void;
  onViewBook: (bookId: string) => void;
}

export const Library: React.FC<Props> = ({ studyBooks, onStartStudy, onOpenCreator, onDeleteBook, onViewBook }) => {

    const booksWithStats = useMemo(() => {
        const now = Date.now();
        return studyBooks.map(book => {
            const dueCards = book.cards.filter(card => card.nextReview <= now && !card.isSkipped).length;
            const mistakeCards = book.cards.filter(card => card.incorrectAnswers.length > 0).length;
            return { ...book, dueCards, mistakeCards };
        }).sort((a,b) => b.createdAt - a.createdAt);
    }, [studyBooks]);
    
  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-text-primary">My Library</h1>
          <button
            onClick={onOpenCreator}
            className="flex items-center justify-center bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-500 transition-colors shadow-lg"
          >
            <PlusIcon />
            <span className="ml-2">New Book</span>
          </button>
        </div>

        {booksWithStats.length === 0 ? (
            <div className="text-center py-20 bg-surface rounded-lg">
                <h2 className="text-2xl font-semibold text-text-primary">Your library is empty.</h2>
                <p className="text-text-secondary mt-2">Click "New Book" to start your learning journey!</p>
            </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {booksWithStats.map((book) => (
            <div key={book.id} className="bg-surface rounded-lg shadow-md overflow-hidden flex flex-col justify-between transition hover:shadow-primary/50 hover:scale-[1.02]">
              <div className="p-5 cursor-pointer flex-grow" onClick={() => onViewBook(book.id)}>
                <div className="flex justify-between items-start">
                    <h2 className="text-xl font-bold text-text-primary mb-2">{book.title}</h2>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteBook(book.id); }} 
                        className="text-gray-500 hover:text-incorrect p-1 rounded-full z-10 relative"
                        aria-label="Delete book"
                    >
                        <TrashIcon />
                    </button>
                </div>
                <p className="text-sm text-text-secondary mb-4">{book.cards.length} sentences</p>
                <div className="space-y-2 text-sm">
                    <div className="flex items-center text-green-400">
                        <span className="font-semibold w-32">Ready to review:</span> 
                        <span>{book.dueCards} cards</span>
                    </div>
                    <div className="flex items-center text-yellow-400">
                        <span className="font-semibold w-32">Mistakes:</span> 
                        <span>{book.mistakeCards} cards</span>
                    </div>
                </div>
              </div>
              <div className="bg-gray-800 p-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => onStartStudy(book.id, StudyMode.Learn)}
                  disabled={book.dueCards === 0}
                  className="flex items-center justify-center w-full bg-primary text-white font-semibold py-2 px-3 rounded-md hover:bg-indigo-500 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  <BookOpenIcon /> Study
                </button>
                <button
                  onClick={() => onStartStudy(book.id, StudyMode.ReviewMistakes)}
                  disabled={book.mistakeCards === 0}
                  className="flex items-center justify-center w-full bg-secondary text-white font-semibold py-2 px-3 rounded-md hover:bg-green-500 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  <BrainIcon/> Review Mistakes
                </button>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  );
};