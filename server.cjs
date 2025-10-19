const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

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

// 启动服务器
async function startServer() {
  await ensureLibraryDir();
  
  app.listen(PORT, () => {
    console.log(`Library server running on http://localhost:${PORT}`);
    console.log(`Library path: ${LIBRARY_PATH}`);
  });
}

startServer().catch(console.error);
