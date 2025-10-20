const fs = require('fs').promises;
const path = require('path');
const { DatabaseService } = require('../dist/databaseService.cjs');

/**
 * 将现有的文件系统书籍数据迁移到SQLite数据库
 */
async function migrateExistingBooks() {
  try {
    console.log('Starting migration of existing books to database...');
    
    const db = DatabaseService.getInstance();
    const libraryPath = path.join(process.cwd(), 'library');
    
    // 检查library目录是否存在
    try {
      await fs.access(libraryPath);
    } catch (error) {
      console.log('Library directory does not exist, no migration needed.');
      return;
    }
    
    // 读取所有书籍目录
    const bookDirs = await fs.readdir(libraryPath, { withFileTypes: true });
    const bookNames = bookDirs
      .filter(item => item.isDirectory())
      .map(item => item.name);
    
    console.log(`Found ${bookNames.length} books to migrate:`, bookNames);
    
    let totalCards = 0;
    
    for (const bookName of bookNames) {
      console.log(`\nMigrating book: ${bookName}`);
      
      const bookPath = path.join(libraryPath, bookName);
      
      // 读取书籍的所有章节文件
      const files = await fs.readdir(bookPath);
      const txtFiles = files.filter(file => file.endsWith('.txt'));
      
      const allCards = [];
      
      for (const file of txtFiles) {
        const filePath = path.join(bookPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.trim().split('\n');
        
        for (const line of lines) {
          const parts = line.split('===');
          if (parts.length === 2) {
            const chinese = parts[0].trim();
            const english = parts[1].trim();
            
            // 移除行号前缀
            const cleanChinese = chinese.replace(/^\d+\.\s*/, '');
            const cleanEnglish = english.replace(/^\d+\.\s*/, '');
            
            allCards.push({
              bookId: bookName,
              chinese: cleanChinese,
              english: cleanEnglish,
              memoryLevel: 1,
              lastReviewed: null,
              nextReview: Date.now(),
              incorrectAnswers: [],
              isSkipped: false,
              correctStreak: 0
            });
          }
        }
      }
      
      if (allCards.length > 0) {
        // 创建书籍记录
        await db.createBook(bookName, bookName);
        
        // 创建卡片记录
        for (const card of allCards) {
          await db.createCard(card);
        }
        
        totalCards += allCards.length;
        console.log(`  ✓ Migrated ${allCards.length} cards`);
      } else {
        console.log(`  ⚠ No cards found in book: ${bookName}`);
      }
    }
    
    console.log(`\n✅ Migration completed!`);
    console.log(`   Total books migrated: ${bookNames.length}`);
    console.log(`   Total cards migrated: ${totalCards}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  migrateExistingBooks()
    .then(() => {
      console.log('Migration finished successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateExistingBooks };
