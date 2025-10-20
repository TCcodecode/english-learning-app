import { StudyBook, SentenceCard } from '../types';

export interface LibrarySection {
  name: string;
  content: string;
}

export interface LibraryBook {
  name: string;
  sections: LibrarySection[];
}

export class LibraryService {
  private static readonly LIBRARY_PATH = './library';

  /**
   * 从数据库加载所有书籍（包含学习进度）
   */
  static async loadAllBooks(): Promise<StudyBook[]> {
    try {
      const response = await fetch('/api/study-books');
      if (!response.ok) {
        throw new Error('Failed to load study books');
      }
      const books: StudyBook[] = await response.json();
      return books;
    } catch (error) {
      console.error('Error loading study books:', error);
      return [];
    }
  }

  /**
   * 加载特定书籍（包含学习进度）
   */
  static async loadBook(bookName: string): Promise<StudyBook | null> {
    try {
      const response = await fetch(`/api/study-books/${encodeURIComponent(bookName)}`);
      if (!response.ok) {
        throw new Error(`Failed to load study book: ${bookName}`);
      }
      const book: StudyBook = await response.json();
      return book;
    } catch (error) {
      console.error(`Error loading study book ${bookName}:`, error);
      return null;
    }
  }

  /**
   * 创建新书籍（包含学习进度）
   */
  static async createBook(bookName: string, content?: string): Promise<StudyBook> {
    try {
      let cards: SentenceCard[] = [];
      
      if (content) {
        cards = this.parseContentToCards(content);
      }

      const response = await fetch('/api/study-books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: bookName,
          title: bookName,
          cards: cards
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create study book');
      }

      const result = await response.json();
      return {
        id: result.id,
        title: result.title,
        cards: cards,
        createdAt: Date.now()
      };
    } catch (error) {
      console.error('Error creating study book:', error);
      throw error;
    }
  }

  /**
   * 删除书籍（包含学习进度）
   */
  static async deleteBook(bookName: string): Promise<void> {
    try {
      const response = await fetch(`/api/study-books/${encodeURIComponent(bookName)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete study book: ${bookName}`);
      }
    } catch (error) {
      console.error(`Error deleting study book ${bookName}:`, error);
      throw error;
    }
  }

  /**
   * 更新书籍学习进度
   */
  static async updateBookProgress(updatedBook: StudyBook): Promise<void> {
    try {
      const response = await fetch(`/api/study-books/${encodeURIComponent(updatedBook.id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cards: updatedBook.cards
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update study book: ${updatedBook.id}`);
      }
    } catch (error) {
      console.error(`Error updating study book ${updatedBook.id}:`, error);
      throw error;
    }
  }

  /**
   * 添加章节到书籍
   */
  static async addSection(bookName: string, sectionName: string, content: string): Promise<void> {
    try {
      const response = await fetch(`/api/library/books/${encodeURIComponent(bookName)}/sections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: sectionName, content }),
      });

      if (!response.ok) {
        throw new Error(`Failed to add section to book: ${bookName}`);
      }
    } catch (error) {
      console.error(`Error adding section to book ${bookName}:`, error);
      throw error;
    }
  }

  /**
   * 删除书籍中的章节
   */
  static async deleteSection(bookName: string, sectionName: string): Promise<void> {
    try {
      const response = await fetch(`/api/library/books/${encodeURIComponent(bookName)}/sections/${encodeURIComponent(sectionName)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete section from book: ${bookName}`);
      }
    } catch (error) {
      console.error(`Error deleting section from book ${bookName}:`, error);
      throw error;
    }
  }

  /**
   * 更新章节内容
   */
  static async updateSection(bookName: string, sectionName: string, content: string): Promise<void> {
    try {
      const response = await fetch(`/api/library/books/${encodeURIComponent(bookName)}/sections/${encodeURIComponent(sectionName)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update section in book: ${bookName}`);
      }
    } catch (error) {
      console.error(`Error updating section in book ${bookName}:`, error);
      throw error;
    }
  }

  /**
   * 解析文本内容为句子卡片
   */
  static parseContentToCards(content: string): SentenceCard[] {
    const lines = content.trim().split('\n');
    const cards: SentenceCard[] = [];

    lines.forEach((line, index) => {
      const parts = line.split('===');
      if (parts.length === 2) {
        const chinese = parts[0].trim();
        const english = parts[1].trim();
        
        // 移除行号前缀（如 "1. "）
        const cleanChinese = chinese.replace(/^\d+\.\s*/, '');
        const cleanEnglish = english.replace(/^\d+\.\s*/, '');

        cards.push({
          id: Date.now() + index,
          chinese: cleanChinese,
          english: cleanEnglish,
          memoryLevel: 1,
          lastReviewed: null,
          nextReview: Date.now(),
          incorrectAnswers: [],
          isSkipped: false,
          correctStreak: 0,
        });
      }
    });

    return cards;
  }

  /**
   * 将 LibraryBook 转换为 StudyBook
   */
  private static convertLibraryBookToStudyBook(libraryBook: LibraryBook): StudyBook {
    const allCards: SentenceCard[] = [];
    
    libraryBook.sections.forEach(section => {
      const sectionCards = this.parseContentToCards(section.content);
      allCards.push(...sectionCards);
    });

    return {
      id: libraryBook.name,
      title: libraryBook.name,
      cards: allCards,
      createdAt: Date.now(), // 在实际实现中，可以从文件系统获取创建时间
    };
  }

  /**
   * 将 StudyBook 转换回 LibraryBook 格式（用于保存）
   */
  static convertStudyBookToLibraryBook(studyBook: StudyBook): LibraryBook {
    // 为了保持原有的章节结构，我们需要按原始章节分组卡片
    // 由于StudyBook中的卡片失去了原始章节信息，我们需要从文件系统重新加载原始结构
    // 然后更新其中的卡片数据
    return {
      name: studyBook.title,
      sections: [{
        name: 'section_1',
        content: studyBook.cards.map(card => `${card.chinese}===${card.english}`).join('\n')
      }]
    };
  }
}
