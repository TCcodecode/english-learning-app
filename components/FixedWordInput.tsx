import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

interface Props {
  sentence: string;
  onAnswerChange: (answer: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

const isWord = (part: string) => /^[a-zA-Z']+$/.test(part);

export const FixedWordInput: React.FC<Props> = ({ sentence, onAnswerChange, onSubmit, disabled }) => {
  const parts = useMemo(() => sentence.match(/\b[\w']+\b|[^\s\w']/g) || [], [sentence]);
  const wordCount = useMemo(() => parts.filter(isWord).length, [parts]);
  
  const [userWords, setUserWords] = useState<string[]>(() => Array(wordCount).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setUserWords(Array(wordCount).fill(''));
    inputRefs.current = Array(wordCount).fill(null);
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  }, [sentence, wordCount]);

  useEffect(() => {
    let wordIdx = 0;
    const reconstructedParts = parts.map(part => isWord(part) ? userWords[wordIdx++] || '' : part);
    const answerString = reconstructedParts.join(' ').replace(/\s+([.,?!;:'"])/g, '$1').trim();
    onAnswerChange(answerString);
  }, [userWords, parts, onAnswerChange]);


  const handleChange = useCallback((index: number, value: string) => {
    if (value.includes(' ')) {
      if (value.trim() !== '') {
          const newUserWords = [...userWords];
          newUserWords[index] = value.trim();
          setUserWords(newUserWords);
      }
      const nextInput = inputRefs.current[index + 1];
      if (nextInput) {
        nextInput.focus();
      }
      return;
    }

    const newUserWords = [...userWords];
    newUserWords[index] = value;
    setUserWords(newUserWords);
  }, [userWords]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    const { key, currentTarget } = e;

    if (key === 'Enter') {
      e.preventDefault();
      if (!disabled) onSubmit();
      return;
    }
    
    if (key === ' ' || (key === 'ArrowRight' && currentTarget.selectionStart === currentTarget.value.length)) {
        e.preventDefault();
        const nextInput = inputRefs.current[index + 1];
        if (nextInput) nextInput.focus();
    } else if ((key === 'ArrowLeft' && currentTarget.selectionStart === 0) || (key === 'Backspace' && currentTarget.value === '')) {
        e.preventDefault();
        const prevInput = inputRefs.current[index - 1];
        if (prevInput) prevInput.focus();
    }
  }, [onSubmit, disabled]);

  let wordInputIndex = -1;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-4 bg-surface/50 border-2 border-gray-700 rounded-lg p-4 text-text-primary text-lg transition-shadow min-h-[76px]">
      {parts.map((part, i) => {
        if (isWord(part)) {
          wordInputIndex++;
          const currentIndex = wordInputIndex;
          return (
            <input
              key={`${part}-${i}`}
              // Fix: The ref callback should not return a value. Using a block statement to ensure a void return.
              ref={el => { inputRefs.current[currentIndex] = el; }}
              type="text"
              value={userWords[currentIndex]}
              onChange={(e) => handleChange(currentIndex, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, currentIndex)}
              disabled={disabled}
              className="bg-gray-700 rounded p-1 text-center text-lg outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-600 disabled:text-gray-400"
              style={{ width: `${Math.max(part.length, 3) * 1.2}ch`, minWidth: '3ch' }}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
          );
        } else {
          return <span key={`${part}-${i}`} className="text-2xl font-medium px-1 self-center">{part}</span>;
        }
      })}
    </div>
  );
};