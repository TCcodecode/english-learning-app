const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const { DatabaseService } = require('./dist/databaseService.cjs');

const app = express();
const PORT = 3001;
const LIBRARY_PATH = path.join(__dirname, 'library');

// 中间件
app.use(cors());
app.use(express.json());

// 确保 library 目录存在
async function ensureLibraryDir() {
  try {
    await fs.access(LIBRARY_PATH);
  } catch (error) {
    await fs.mkdir(LIBRARY_PATH, { recursive: true });
  }
}

// 工具函数：读取目录下的所有文件夹
async function getBookDirectories() {
  try {
    const items = await fs.readdir(LIBRARY_PATH, { withFileTypes: true });
    return items
      .filter(item => item.isDirectory())
      .map(item => item.name);
  } catch (error) {
    console.error('Error reading library directory:', error);
    return [];
  }
}

// 工具函数：读取书籍的所有章节
async function getBookSections(bookName) {
  const bookPath = path.join(LIBRARY_PATH, bookName);
  try {
    const files = await fs.readdir(bookPath);
    const txtFiles = files.filter(file => file.endsWith('.txt'));
    
    const sections = [];
    for (const file of txtFiles) {
      const filePath = path.join(bookPath, file);
      const content = await fs.readFile(filePath, 'utf-8');
      sections.push({
        name: file.replace('.txt', ''),
        content: content.trim()
      });
    }
    return sections;
  } catch (error) {
    console.error(`Error reading sections for book ${bookName}:`, error);
    return [];
  }
}

// API 路由

// 获取所有书籍
app.get('/api/library/books', async (req, res) => {
  try {
    const bookNames = await getBookDirectories();
    const books = [];
    
    for (const bookName of bookNames) {
      const sections = await getBookSections(bookName);
      books.push({
        name: bookName,
        sections
      });
    }
    
    res.json(books);
  } catch (error) {
    console.error('Error loading books:', error);
    res.status(500).json({ error: 'Failed to load books' });
  }
});

// 获取特定书籍
app.get('/api/library/books/:bookName', async (req, res) => {
  try {
    const { bookName } = req.params;
    const bookPath = path.join(LIBRARY_PATH, bookName);
    
    // 检查书籍目录是否存在
    try {
      await fs.access(bookPath);
    } catch (error) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    const sections = await getBookSections(bookName);
    res.json({
      name: bookName,
      sections
    });
  } catch (error) {
    console.error(`Error loading book ${req.params.bookName}:`, error);
    res.status(500).json({ error: 'Failed to load book' });
  }
});

// 创建新书籍
app.post('/api/library/books', async (req, res) => {
  try {
    const { name, sections = [] } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Book name is required' });
    }
    
    const bookPath = path.join(LIBRARY_PATH, name);
    
    // 检查书籍是否已存在
    try {
      await fs.access(bookPath);
      return res.status(409).json({ error: 'Book already exists' });
    } catch (error) {
      // 目录不存在，可以创建
    }
    
    // 创建书籍目录
    await fs.mkdir(bookPath, { recursive: true });
    
    // 创建章节文件
    for (const section of sections) {
      if (section.name && section.content) {
        const sectionPath = path.join(bookPath, `${section.name}.txt`);
        await fs.writeFile(sectionPath, section.content, 'utf-8');
      }
    }
    
    // 如果没有提供章节，创建一个默认章节
    if (sections.length === 0) {
      const defaultSectionPath = path.join(bookPath, 'section_1.txt');
      await fs.writeFile(defaultSectionPath, '', 'utf-8');
    }
    
    const createdSections = await getBookSections(name);
    res.json({
      name,
      sections: createdSections
    });
  } catch (error) {
    console.error('Error creating book:', error);
    res.status(500).json({ error: 'Failed to create book' });
  }
});

// 删除书籍
app.delete('/api/library/books/:bookName', async (req, res) => {
  try {
    const { bookName } = req.params;
    const bookPath = path.join(LIBRARY_PATH, bookName);
    
    // 检查书籍目录是否存在
    try {
      await fs.access(bookPath);
    } catch (error) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    // 递归删除书籍目录
    await fs.rm(bookPath, { recursive: true, force: true });
    
    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    console.error(`Error deleting book ${req.params.bookName}:`, error);
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

// 添加章节到书籍
app.post('/api/library/books/:bookName/sections', async (req, res) => {
  try {
    const { bookName } = req.params;
    const { name, content } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Section name is required' });
    }
    
    if (content === undefined || typeof content !== 'string') {
      return res.status(400).json({ error: 'Section content is required' });
    }
    
    const bookPath = path.join(LIBRARY_PATH, bookName);
    
    // 检查书籍目录是否存在
    try {
      await fs.access(bookPath);
    } catch (error) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    const sectionPath = path.join(bookPath, `${name}.txt`);
    
    // 检查章节是否已存在
    try {
      await fs.access(sectionPath);
      return res.status(409).json({ error: 'Section already exists' });
    } catch (error) {
      // 文件不存在，可以创建
    }
    
    await fs.writeFile(sectionPath, content, 'utf-8');
    
    res.json({ message: 'Section created successfully' });
  } catch (error) {
    console.error(`Error adding section to book ${req.params.bookName}:`, error);
    res.status(500).json({ error: 'Failed to add section' });
  }
});

// 删除章节
app.delete('/api/library/books/:bookName/sections/:sectionName', async (req, res) => {
  try {
    const { bookName, sectionName } = req.params;
    const sectionPath = path.join(LIBRARY_PATH, bookName, `${sectionName}.txt`);
    
    // 检查章节文件是否存在
    try {
      await fs.access(sectionPath);
    } catch (error) {
      return res.status(404).json({ error: 'Section not found' });
    }
    
    await fs.unlink(sectionPath);
    
    res.json({ message: 'Section deleted successfully' });
  } catch (error) {
    console.error(`Error deleting section from book ${req.params.bookName}:`, error);
    res.status(500).json({ error: 'Failed to delete section' });
  }
});

// 更新章节
app.put('/api/library/books/:bookName/sections/:sectionName', async (req, res) => {
  try {
    const { bookName, sectionName } = req.params;
    const { content } = req.body;
    
    if (content === undefined || typeof content !== 'string') {
      return res.status(400).json({ error: 'Section content is required' });
    }
    
    const sectionPath = path.join(LIBRARY_PATH, bookName, `${sectionName}.txt`);
    
    // 检查章节文件是否存在
    try {
      await fs.access(sectionPath);
    } catch (error) {
      return res.status(404).json({ error: 'Section not found' });
    }
    
    await fs.writeFile(sectionPath, content, 'utf-8');
    
    res.json({ message: 'Section updated successfully' });
  } catch (error) {
    console.error(`Error updating section in book ${req.params.bookName}:`, error);
    res.status(500).json({ error: 'Failed to update section' });
  }
});

// 新的SQLite API路由

// 获取带学习进度的书籍列表
app.get('/api/study-books', async (req, res) => {
  try {
    const db = DatabaseService.getInstance();
    const books = await db.getAllBooks();
    
    const booksWithCards = [];
    for (const book of books) {
      const cards = await db.getCardsByBookId(book.id);
      const now = Date.now();
      const dueCards = cards.filter(card => card.next_review <= now && !card.is_skipped).length;
      const mistakeCards = cards.filter(card => card.incorrectAnswers.length > 0).length;
      
      booksWithCards.push({
        id: book.id,
        title: book.title,
        cards: cards.map(card => ({
          id: card.id,
          chinese: card.chinese,
          english: card.english,
          memoryLevel: card.memory_level,
          lastReviewed: card.last_reviewed,
          nextReview: card.next_review,
          incorrectAnswers: card.incorrectAnswers,
          isSkipped: card.is_skipped,
          correctStreak: card.correct_streak
        })),
        createdAt: book.created_at,
        dueCards,
        mistakeCards
      });
    }
    
    res.json(booksWithCards);
  } catch (error) {
    console.error('Error loading study books:', error);
    res.status(500).json({ error: 'Failed to load study books' });
  }
});

// 获取特定书籍的学习进度
app.get('/api/study-books/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;
    const db = DatabaseService.getInstance();
    
    const book = await db.getBook(bookId);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    const cards = await db.getCardsByBookId(bookId);
    const studyBook = {
      id: book.id,
      title: book.title,
      cards: cards.map(card => ({
        id: card.id,
        chinese: card.chinese,
        english: card.english,
        memoryLevel: card.memory_level,
        lastReviewed: card.last_reviewed,
        nextReview: card.next_review,
        incorrectAnswers: card.incorrectAnswers,
        isSkipped: card.is_skipped,
        correctStreak: card.correct_streak
      })),
      createdAt: book.created_at
    };
    
    res.json(studyBook);
  } catch (error) {
    console.error(`Error loading study book ${req.params.bookId}:`, error);
    res.status(500).json({ error: 'Failed to load study book' });
  }
});

// 更新书籍学习进度
app.put('/api/study-books/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;
    const { title, cards } = req.body;
    
    if (!Array.isArray(cards)) {
      return res.status(400).json({ error: 'Cards array is required' });
    }
    
    const db = DatabaseService.getInstance();
    
    // 如果提供了标题，更新书籍标题
    if (title && typeof title === 'string') {
      await db.updateBookTitle(bookId, title);
    }
    
    // 更新每张卡片
    for (const card of cards) {
      await db.updateCard(card.id, {
        memory_level: card.memoryLevel,
        last_reviewed: card.lastReviewed,
        next_review: card.nextReview,
        incorrect_answers: JSON.stringify(card.incorrectAnswers),
        is_skipped: card.isSkipped,
        correct_streak: card.correctStreak
      });
    }
    
    // 更新书籍时间戳
    await db.updateBookTimestamp(bookId);
    
    res.json({ message: 'Study book updated successfully' });
  } catch (error) {
    console.error(`Error updating study book ${req.params.bookId}:`, error);
    res.status(500).json({ error: 'Failed to update study book' });
  }
});

// 重命名书籍
app.put('/api/study-books/:bookId/rename', async (req, res) => {
  try {
    const { bookId } = req.params;
    const { title } = req.body;
    
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Book title is required' });
    }
    
    const db = DatabaseService.getInstance();
    await db.updateBookTitle(bookId, title);
    
    res.json({ message: 'Book renamed successfully' });
  } catch (error) {
    console.error(`Error renaming book ${req.params.bookId}:`, error);
    res.status(500).json({ error: 'Failed to rename book' });
  }
});

// 清空书籍中的所有卡片
app.delete('/api/study-books/:bookId/clear', async (req, res) => {
  try {
    const { bookId } = req.params;
    const db = DatabaseService.getInstance();
    
    await db.clearBookCards(bookId);
    
    res.json({ message: 'Book cards cleared successfully' });
  } catch (error) {
    console.error(`Error clearing book ${req.params.bookId}:`, error);
    res.status(500).json({ error: 'Failed to clear book' });
  }
});

// 删除单个卡片
app.delete('/api/study-books/:bookId/cards/:cardId', async (req, res) => {
  try {
    const { bookId, cardId } = req.params;
    const db = DatabaseService.getInstance();
    
    await db.deleteCard(parseInt(cardId));
    
    res.json({ message: 'Card deleted successfully' });
  } catch (error) {
    console.error(`Error deleting card ${req.params.cardId}:`, error);
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

// 批量添加卡片到书籍
app.post('/api/study-books/:bookId/cards', async (req, res) => {
  try {
    const { bookId } = req.params;
    const { cards } = req.body;
    
    if (!Array.isArray(cards)) {
      return res.status(400).json({ error: 'Cards array is required' });
    }
    
    const db = DatabaseService.getInstance();
    
    // 为每张卡片添加bookId
    const cardsWithBookId = cards.map(card => ({
      ...card,
      bookId: bookId
    }));
    
    await db.createCards(cardsWithBookId);
    
    res.json({ message: 'Cards added successfully' });
  } catch (error) {
    console.error(`Error adding cards to book ${req.params.bookId}:`, error);
    res.status(500).json({ error: 'Failed to add cards' });
  }
});

// 创建带学习进度的新书籍
app.post('/api/study-books', async (req, res) => {
  try {
    const { id, title, cards = [] } = req.body;
    
    if (!id || !title) {
      return res.status(400).json({ error: 'Book id and title are required' });
    }
    
    const db = DatabaseService.getInstance();
    
    // 创建书籍记录
    await db.createBook(id, title);
    
    // 创建卡片记录
    for (const card of cards) {
      await db.createCard({
        bookId: id,
        chinese: card.chinese,
        english: card.english,
        memoryLevel: card.memoryLevel,
        lastReviewed: card.lastReviewed,
        nextReview: card.nextReview,
        incorrectAnswers: card.incorrectAnswers,
        isSkipped: card.isSkipped,
        correctStreak: card.correctStreak
      });
    }
    
    // 同时创建文件系统记录（保持兼容性）
    const bookPath = path.join(LIBRARY_PATH, id);
    await fs.mkdir(bookPath, { recursive: true });
    
    if (cards.length > 0) {
      const content = cards.map(card => `${card.chinese}===${card.english}`).join('\n');
      const sectionPath = path.join(bookPath, 'section_1.txt');
      await fs.writeFile(sectionPath, content, 'utf-8');
    } else {
      const defaultSectionPath = path.join(bookPath, 'section_1.txt');
      await fs.writeFile(defaultSectionPath, '', 'utf-8');
    }
    
    res.json({ message: 'Study book created successfully', id, title });
  } catch (error) {
    console.error('Error creating study book:', error);
    res.status(500).json({ error: 'Failed to create study book' });
  }
});

// 删除书籍（包括学习进度）
app.delete('/api/study-books/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;
    const db = DatabaseService.getInstance();
    
    // 删除数据库记录
    await db.deleteBook(bookId);
    
    // 删除文件系统记录
    const bookPath = path.join(LIBRARY_PATH, bookId);
    try {
      await fs.rm(bookPath, { recursive: true, force: true });
    } catch (error) {
      // 文件系统删除失败不影响数据库删除
      console.warn('Failed to delete file system book:', error);
    }
    
    res.json({ message: 'Study book deleted successfully' });
  } catch (error) {
    console.error(`Error deleting study book ${req.params.bookId}:`, error);
    res.status(500).json({ error: 'Failed to delete study book' });
  }
});

// 启动服务器
async function startServer() {
  await ensureLibraryDir();
  
  // 初始化数据库
  try {
    const db = DatabaseService.getInstance();
    console.log('Database initialized');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
  
  app.listen(PORT, () => {
    console.log(`Library server running on http://localhost:${PORT}`);
    console.log(`Library path: ${LIBRARY_PATH}`);
  });
}

startServer().catch(console.error);
