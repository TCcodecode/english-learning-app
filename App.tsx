import React, { useState, useCallback } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useLibraryService } from './hooks/useLibraryService';
import { StudyBook, View, StudyMode, WordBook, WordCard } from './types';
import { Library } from './components/Library';
import { StudySession } from './components/StudySession';
import { StudyBookCreator } from './components/StudyBookCreator';
import { StudyBookDetail } from './components/StudyBookDetail';

const App: React.FC = () => {
  const { studyBooks, loading, error, createBook, deleteBook, updateBook, clearError } = useLibraryService();
  const [wordBook, setWordBook] = useLocalStorage<WordBook>('wordBook', {id: 'main-word-book', title: "My Word Book", cards: []});
  
  const [currentView, setCurrentView] = useState<View>(View.Library);
  const [activeStudy, setActiveStudy] = useState<{ book: StudyBook; mode: StudyMode } | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);

  const handleCreateBook = async (book: StudyBook) => {
    try {
      await createBook(book.title, book.cards.map(card => `${card.chinese}===${card.english}`).join('\n'));
    } catch (error) {
      console.error('Failed to create book:', error);
      // 可以在这里添加错误提示
    }
  };
  
  const handleDeleteBook = useCallback(async (bookId: string) => {
    if (window.confirm("Are you sure you want to delete this book and all its progress?")) {
        try {
          await deleteBook(bookId);
        } catch (error) {
          console.error('Failed to delete book:', error);
          // 可以在这里添加错误提示
        }
    }
  }, [deleteBook]);

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

  const handleSessionEnd = useCallback(async (updatedBook: StudyBook) => {
    try {
      await updateBook(updatedBook);
      setActiveStudy(null);
      setCurrentView(View.Library);
    } catch (error) {
      console.error('Failed to update book after session:', error);
      // 可以在这里添加错误提示
    }
  }, [updateBook]);

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
              return <StudyBookDetail 
                book={book} 
                onBack={handleBackToLibrary}
                onBookUpdate={updateBook}
                onBookDelete={handleDeleteBook}
              />;
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

  // 显示加载状态
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-primary">Loading library...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background">
          {error && (
            <div className="bg-red-500 text-white p-4 text-center">
              <p>Error: {error}</p>
              <button 
                onClick={clearError}
                className="mt-2 bg-white text-red-500 px-4 py-2 rounded hover:bg-gray-100"
              >
                Dismiss
              </button>
            </div>
          )}
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
