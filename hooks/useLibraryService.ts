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
      
      let sections = [];
      if (content) {
        sections = [{
          name: 'section_1',
          content
        }];
      }
      
      const newBook = await LibraryService.createBook(bookName, sections);
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
      
      // 首先加载原始的书籍结构以保持章节信息
      const originalLibraryBook = await LibraryService.loadBook(updatedBook.id);
      if (!originalLibraryBook) {
        throw new Error(`Original book ${updatedBook.id} not found`);
      }
      
      // 获取原始书籍的章节结构
      const response = await fetch(`/api/library/books/${encodeURIComponent(updatedBook.id)}`);
      if (!response.ok) {
        throw new Error(`Failed to load original book structure: ${updatedBook.id}`);
      }
      const originalBookStructure = await response.json();
      
      // 将更新后的卡片数据重新分配到原始章节中
      // 由于卡片失去了原始章节信息，我们将所有卡片放入第一个章节
      // 这是一个简化的解决方案，理想情况下应该保存卡片的原始章节信息
      if (originalBookStructure.sections.length > 0) {
        const firstSection = originalBookStructure.sections[0];
        firstSection.content = updatedBook.cards.map(card => `${card.chinese}===${card.english}`).join('\n');
        
        // 更新第一个章节
        await LibraryService.updateSection(updatedBook.id, firstSection.name, firstSection.content);
        
        // 如果有其他章节，保持它们不变
        for (let i = 1; i < originalBookStructure.sections.length; i++) {
          const section = originalBookStructure.sections[i];
          // 这里不需要更新，因为我们只修改了第一个章节的内容
        }
      } else {
        // 如果没有章节，创建一个默认章节
        await LibraryService.addSection(updatedBook.id, 'section_1', 
          updatedBook.cards.map(card => `${card.chinese}===${card.english}`).join('\n')
        );
      }
      
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
