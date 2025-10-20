import { useState, useEffect, useCallback } from 'react';
import { StudyBook } from '../types';
import { LibraryService } from '../services/libraryService';

export function useLibraryService() {
  const [studyBooks, setStudyBooks] = useState<StudyBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载所有书籍
  const loadBooks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const books = await LibraryService.loadAllBooks();
      setStudyBooks(books);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load books');
      console.error('Error loading books:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 创建新书籍
  const createBook = useCallback(async (bookName: string, content?: string) => {
    try {
      setError(null);
      
      const newBook = await LibraryService.createBook(bookName, content);
      setStudyBooks(prev => [...prev, newBook]);
      return newBook;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create book';
      setError(errorMessage);
      console.error('Error creating book:', err);
      throw err;
    }
  }, []);

  // 删除书籍
  const deleteBook = useCallback(async (bookId: string) => {
    try {
      setError(null);
      await LibraryService.deleteBook(bookId);
      setStudyBooks(prev => prev.filter(book => book.id !== bookId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete book';
      setError(errorMessage);
      console.error('Error deleting book:', err);
      throw err;
    }
  }, []);

  // 更新书籍（当学习进度改变时）
  const updateBook = useCallback(async (updatedBook: StudyBook) => {
    try {
      setError(null);
      
      // 使用新的SQLite API更新学习进度
      await LibraryService.updateBookProgress(updatedBook);
      
      // 更新本地状态
      setStudyBooks(prev =>
        prev.map(book => (book.id === updatedBook.id ? updatedBook : book))
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update book';
      setError(errorMessage);
      console.error('Error updating book:', err);
      throw err;
    }
  }, []);

  // 添加章节到书籍
  const addSection = useCallback(async (bookName: string, sectionName: string, content: string) => {
    try {
      setError(null);
      await LibraryService.addSection(bookName, sectionName, content);
      
      // 重新加载该书籍以获取最新状态
      const updatedBook = await LibraryService.loadBook(bookName);
      if (updatedBook) {
        setStudyBooks(prev =>
          prev.map(book => (book.id === bookName ? updatedBook : book))
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add section';
      setError(errorMessage);
      console.error('Error adding section:', err);
      throw err;
    }
  }, []);

  // 删除章节
  const deleteSection = useCallback(async (bookName: string, sectionName: string) => {
    try {
      setError(null);
      await LibraryService.deleteSection(bookName, sectionName);
      
      // 重新加载该书籍以获取最新状态
      const updatedBook = await LibraryService.loadBook(bookName);
      if (updatedBook) {
        setStudyBooks(prev =>
          prev.map(book => (book.id === bookName ? updatedBook : book))
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete section';
      setError(errorMessage);
      console.error('Error deleting section:', err);
      throw err;
    }
  }, []);

  // 更新章节
  const updateSection = useCallback(async (bookName: string, sectionName: string, content: string) => {
    try {
      setError(null);
      await LibraryService.updateSection(bookName, sectionName, content);
      
      // 重新加载该书籍以获取最新状态
      const updatedBook = await LibraryService.loadBook(bookName);
      if (updatedBook) {
        setStudyBooks(prev =>
          prev.map(book => (book.id === bookName ? updatedBook : book))
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update section';
      setError(errorMessage);
      console.error('Error updating section:', err);
      throw err;
    }
  }, []);

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 初始化时加载书籍
  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  return {
    studyBooks,
    loading,
    error,
    loadBooks,
    createBook,
    deleteBook,
    updateBook,
    addSection,
    deleteSection,
    updateSection,
    clearError,
  };
}
