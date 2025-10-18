
import React, { useState } from 'react';
import { StudyBook, SentenceCard } from '../types';
import { translateSentences } from '../services/geminiService';

interface Props {
  onClose: () => void;
  onCreateBook: (book: StudyBook) => void;
}

type ImportMode = 'translate' | 'bilingual';

export const StudyBookCreator: React.FC<Props> = ({ onClose, onCreateBook }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mode, setMode] = useState<ImportMode>('translate');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) {
      setError('Title and content cannot be empty.');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      let cards: SentenceCard[] = [];
      const lines = content.trim().split('\n').filter(line => line.trim() !== '');

      if (mode === 'translate') {
        const chineseSentences = lines;
        const englishSentences = await translateSentences(chineseSentences);
        cards = chineseSentences.map((chinese, i) => ({
          id: i + 1,
          chinese,
          english: englishSentences[i],
          memoryLevel: 1,
          lastReviewed: null,
          nextReview: Date.now(),
          incorrectAnswers: [],
          isSkipped: false,
          correctStreak: 0,
        }));
      } else { // bilingual
        cards = lines.map((line, i) => {
          const parts = line.split(/===|---|\|/); // Use a regex for multiple separators
          if (parts.length < 2) throw new Error(`Invalid format on line ${i + 1}. Use 'Chinese === English'.`);
          return {
            id: i + 1,
            chinese: parts[0].trim(),
            english: parts[1].trim(),
            memoryLevel: 1,
            lastReviewed: null,
            nextReview: Date.now(),
            incorrectAnswers: [],
            isSkipped: false,
            correctStreak: 0,
          };
        });
      }

      const newBook: StudyBook = {
        id: `book-${Date.now()}`,
        title,
        cards,
        createdAt: Date.now(),
      };
      onCreateBook(newBook);
      onClose();

    } catch (err: any) {
      setError(err.message || 'Failed to create book.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-2xl max-h-full overflow-y-auto">
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4 text-text-primary">Create New Study Book</h2>
            
            <div className="mb-4">
                <label htmlFor="title" className="block text-sm font-medium text-text-secondary mb-1">Book Title</label>
                <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Daily Conversations"
                    className="w-full bg-background border border-gray-600 rounded-md px-3 py-2 text-text-primary focus:ring-2 focus:ring-primary focus:border-primary"
                />
            </div>
            
            <div className="mb-4">
                <div className="flex border-b border-gray-600">
                    <button onClick={() => setMode('translate')} className={`px-4 py-2 text-sm font-medium ${mode === 'translate' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:bg-gray-700'}`}>
                        Translate Chinese (AI)
                    </button>
                    <button onClick={() => setMode('bilingual')} className={`px-4 py-2 text-sm font-medium ${mode === 'bilingual' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:bg-gray-700'}`}>
                        Import Bilingual
                    </button>
                </div>
            </div>

            <div>
                <label htmlFor="content" className="block text-sm font-medium text-text-secondary mb-1">
                    {mode === 'translate' ? 'Paste Chinese sentences (one per line)' : "Paste bilingual text (e.g., '你好 === Hello')"}
                </label>
                <textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={10}
                    className="w-full bg-background border border-gray-600 rounded-md px-3 py-2 text-text-primary focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder={mode === 'translate' ? '你好世界\n欢迎使用 FluentFlow' : '你好世界 === Hello World\n欢迎使用 FluentFlow === Welcome to FluentFlow'}
                />
            </div>
            
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

        </div>
        <div className="bg-gray-800 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-text-primary bg-gray-600 hover:bg-gray-500 transition"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="px-4 py-2 rounded-md text-white bg-primary hover:bg-indigo-500 transition flex items-center disabled:bg-indigo-800 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
            {isLoading ? 'Creating...' : 'Create Book'}
          </button>
        </div>
      </div>
    </div>
  );
};
