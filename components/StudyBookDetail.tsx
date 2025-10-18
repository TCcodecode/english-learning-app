import React from 'react';
import { StudyBook } from '../types';
import { ArrowLeftIcon } from './Icons';

interface Props {
  book: StudyBook;
  onBack: () => void;
}

export const StudyBookDetail: React.FC<Props> = ({ book, onBack }) => {
  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <button onClick={onBack} className="flex items-center text-text-secondary hover:text-text-primary transition-colors mb-4 p-2 -ml-2 rounded-md">
            <ArrowLeftIcon />
            <span className="ml-2 font-semibold">Back to Library</span>
          </button>
          <h1 className="text-4xl font-bold text-text-primary">{book.title}</h1>
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
                </tr>
              </thead>
              <tbody>
                {book.cards.length > 0 ? book.cards.map((card, index) => (
                  <tr key={card.id} className="border-b bg-surface border-gray-700 hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium whitespace-nowrap text-white">{index + 1}</td>
                    <td className="px-6 py-4">{card.chinese}</td>
                    <td className="px-6 py-4">{card.english}</td>
                    <td className="px-6 py-4 text-center">{card.memoryLevel}</td>
                  </tr>
                )) : (
                    <tr>
                        <td colSpan={4} className="text-center py-12 text-text-secondary">This book has no sentences.</td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
