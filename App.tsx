import React, { useState, useCallback } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { StudyBook, View, StudyMode, WordBook, WordCard } from './types';
import { Library } from './components/Library';
import { StudySession } from './components/StudySession';
import { StudyBookCreator } from './components/StudyBookCreator';
import { StudyBookDetail } from './components/StudyBookDetail';

const App: React.FC = () => {
  const [studyBooks, setStudyBooks] = useLocalStorage<StudyBook[]>('studyBooks', []);
  const [wordBook, setWordBook] = useLocalStorage<WordBook>('wordBook', {id: 'main-word-book', title: "My Word Book", cards: []});
  
  const [currentView, setCurrentView] = useState<View>(View.Library);
  const [activeStudy, setActiveStudy] = useState<{ book: StudyBook; mode: StudyMode } | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);

  const handleCreateBook = (book: StudyBook) => {
    setStudyBooks(prev => [...prev, book]);
  };
  
  const handleDeleteBook = useCallback((bookId: string) => {
    if (window.confirm("Are you sure you want to delete this book and all its progress?")) {
        setStudyBooks(prev => prev.filter(b => b.id !== bookId));
    }
  }, [setStudyBooks]);

  const handleStartStudy = (bookId: string, mode: StudyMode) => {
    const book = studyBooks.find(b => b.id === bookId);
    if (book) {
      setActiveStudy({ book, mode });
      setCurrentView(View.StudySession);
    }
  };

  const handleViewBook = (bookId: string) => {
    setSelectedBookId(bookId);
    setCurrentView(View.BookDetail);
  };
  
  const handleBackToLibrary = () => {
      setSelectedBookId(null);
      setCurrentView(View.Library);
  };

  const handleSessionEnd = useCallback((updatedBook: StudyBook) => {
    setStudyBooks(prev =>
      prev.map(b => (b.id === updatedBook.id ? updatedBook : b))
    );
    setActiveStudy(null);
    setCurrentView(View.Library);
  }, [setStudyBooks]);

  const handleAddToWordBook = useCallback((wordsToAdd: {word: string, chinese: string}[]) => {
      setWordBook(prev => {
          const newCards: WordCard[] = [];
          const existingWords = new Set(prev.cards.map(c => c.word.toLowerCase()));

          wordsToAdd.forEach(item => {
              if(!existingWords.has(item.word.toLowerCase())) {
                  newCards.push({
                      id: Date.now() + Math.random(),
                      word: item.word,
                      chinese: item.chinese,
                      memoryLevel: 1,
                      lastReviewed: null,
                      nextReview: Date.now(),
                      correctStreak: 0,
                  });
                  existingWords.add(item.word.toLowerCase());
              }
          });

          return {
              ...prev,
              cards: [...prev.cards, ...newCards],
          };
      });
  }, [setWordBook]);


  const renderContent = () => {
    switch (currentView) {
      case View.StudySession:
        if (activeStudy) {
          return <StudySession 
                    book={activeStudy.book} 
                    mode={activeStudy.mode} 
                    onSessionEnd={handleSessionEnd} 
                    onAddToWordBook={handleAddToWordBook}
                  />;
        }
        // Fallback to library if no active study
        setCurrentView(View.Library);
        return null;
      case View.BookDetail:
          const book = studyBooks.find(b => b.id === selectedBookId);
          if (book) {
              return <StudyBookDetail book={book} onBack={handleBackToLibrary} />;
          }
          setCurrentView(View.Library);
          return null;
      case View.Library:
      default:
        return (
          <Library
            studyBooks={studyBooks}
            onStartStudy={handleStartStudy}
            onOpenCreator={() => setIsCreatorOpen(true)}
            onDeleteBook={handleDeleteBook}
            onViewBook={handleViewBook}
          />
        );
    }
  };

  return (
    <>
      <div className="min-h-screen bg-background">
          {renderContent()}
      </div>
      {isCreatorOpen && (
          <StudyBookCreator
              onClose={() => setIsCreatorOpen(false)}
              onCreateBook={handleCreateBook}
          />
      )}
    </>
  );
};

export default App;