import React, { useState } from 'react';
import { StudyBook, SentenceCard } from '../types';
import { ArrowLeftIcon, EditIcon, TrashIcon, UploadIcon } from './Icons';

interface Props {
  book: StudyBook;
  onBack: () => void;
  onBookUpdate: (updatedBook: StudyBook) => void;
  onBookDelete: (bookId: string) => void;
}

export const StudyBookDetail: React.FC<Props> = ({ book, onBack, onBookUpdate, onBookDelete }) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(book.title);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importMode, setImportMode] = useState<'bilingual' | 'chinese'>('bilingual');

  const handleRenameBook = () => {
    if (newTitle.trim() && newTitle !== book.title) {
      const updatedBook = { ...book, title: newTitle.trim() };
      onBookUpdate(updatedBook);
    }
    setIsEditingTitle(false);
  };

  const handleDeleteCard = (cardId: number) => {
    const updatedCards = book.cards.filter(card => card.id !== cardId);
    const updatedBook = { ...book, cards: updatedCards };
    onBookUpdate(updatedBook);
  };

  const handleClearBook = () => {
    if (window.confirm(`Are you sure you want to clear all sentences from "${book.title}"? This action cannot be undone.`)) {
      const updatedBook = { ...book, cards: [] };
      onBookUpdate(updatedBook);
    }
  };

  const handleDeleteBook = () => {
    if (window.confirm(`Are you sure you want to delete "${book.title}"? This action cannot be undone.`)) {
      onBookDelete(book.id);
      onBack();
    }
  };

  const handleImport = async () => {
    const lines = importText.trim().split('\n').filter(line => line.trim());
    const newCards: SentenceCard[] = [];
    let nextId = Math.max(...book.cards.map(c => c.id), 0) + 1;

    lines.forEach(line => {
      let chinese = '';
      let english = '';

      if (importMode === 'bilingual') {
        const parts = line.split('===');
        if (parts.length === 2) {
          chinese = parts[0].trim();
          english = parts[1].trim();
        }
      } else {
        chinese = line.trim();
        english = ''; // Will be filled by AI later
      }

      if (chinese && english) {
        newCards.push({
          id: nextId++,
          chinese,
          english,
          memoryLevel: 1,
          lastReviewed: null,
          nextReview: Date.now(),
          incorrectAnswers: [],
          isSkipped: false,
          correctStreak: 0
        });
      }
    });

    if (newCards.length > 0) {
      const updatedBook = { ...book, cards: [...book.cards, ...newCards] };
      await onBookUpdate(updatedBook);
      setShowImportModal(false);
      setImportText('');
    } else {
      alert('No valid sentences found. Please check your format.');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <button onClick={onBack} className="flex items-center text-text-secondary hover:text-text-primary transition-colors mb-4 p-2 -ml-2 rounded-md">
            <ArrowLeftIcon />
            <span className="ml-2 font-semibold">Back to Library</span>
          </button>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {isEditingTitle ? (
                <div className="flex items-center">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleRenameBook()}
                    onBlur={handleRenameBook}
                    className="text-4xl font-bold bg-surface border-2 border-primary rounded px-2 py-1 text-text-primary"
                    autoFocus
                  />
                </div>
              ) : (
                <h1 className="text-4xl font-bold text-text-primary">{book.title}</h1>
              )}
              <button
                onClick={() => setIsEditingTitle(true)}
                className="ml-4 p-2 text-text-secondary hover:text-text-primary transition-colors"
                title="Rename book"
              >
                <EditIcon />
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-500 transition-colors"
              >
                <UploadIcon />
                <span className="ml-2">Import</span>
              </button>
              <button
                onClick={handleClearBook}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={handleDeleteBook}
                className="px-4 py-2 bg-incorrect text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete Book
              </button>
            </div>
          </div>
          
          <p className="text-text-secondary mt-2">{book.cards.length} sentences</p>
        </div>

        <div className="bg-surface rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-400">
              <thead className="text-xs uppercase bg-gray-700/50 text-gray-300">
                <tr>
                  <th scope="col" className="px-6 py-3 w-16">#</th>
                  <th scope="col" className="px-6 py-3">Chinese</th>
                  <th scope="col" className="px-6 py-3">English</th>
                  <th scope="col" className="px-6 py-3 w-40 text-center">Memory Level</th>
                  <th scope="col" className="px-6 py-3 w-20 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {book.cards.length > 0 ? book.cards.map((card, index) => (
                  <tr key={card.id} className="border-b bg-surface border-gray-700 hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium whitespace-nowrap text-white">{index + 1}</td>
                    <td className="px-6 py-4">{card.chinese}</td>
                    <td className="px-6 py-4">{card.english}</td>
                    <td className="px-6 py-4 text-center">{card.memoryLevel}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="p-1 text-incorrect hover:text-red-400 transition-colors"
                        title="Delete sentence"
                      >
                        <TrashIcon />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-text-secondary">
                      This book has no sentences. Click "Import" to add sentences.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-surface rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-text-primary mb-4">Import Sentences</h2>
              
              <div className="mb-4">
                <label className="block text-text-secondary mb-2">Import Mode:</label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="bilingual"
                      checked={importMode === 'bilingual'}
                      onChange={(e) => setImportMode(e.target.value as 'bilingual')}
                      className="mr-2"
                    />
                    <span className="text-text-primary">Bilingual (Chinese === English)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="chinese"
                      checked={importMode === 'chinese'}
                      onChange={(e) => setImportMode(e.target.value as 'chinese')}
                      className="mr-2"
                    />
                    <span className="text-text-primary">Chinese Only (AI will translate)</span>
                  </label>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-text-secondary mb-2">
                  {importMode === 'bilingual' 
                    ? 'Enter sentences in format: Chinese === English (one per line)'
                    : 'Enter Chinese sentences (one per line)'
                  }
                </label>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={importMode === 'bilingual' 
                    ? "你好 === Hello\n世界 === World\n今天天气很好 === The weather is nice today"
                    : "你好\n世界\n今天天气很好"
                  }
                  className="w-full h-64 bg-background border border-gray-600 rounded-lg p-3 text-text-primary"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportText('');
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-500 transition-colors"
                >
                  Import
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
