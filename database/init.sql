-- 创建学习进度数据库

-- 书籍表
CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- 卡片表
CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id TEXT NOT NULL,
    chinese TEXT NOT NULL,
    english TEXT NOT NULL,
    memory_level INTEGER DEFAULT 1,
    last_reviewed INTEGER,
    next_review INTEGER NOT NULL,
    incorrect_answers TEXT DEFAULT '[]', -- JSON array
    is_skipped BOOLEAN DEFAULT FALSE,
    correct_streak INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
);

-- 章节表（保持原有文件结构）
CREATE TABLE IF NOT EXISTS sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id TEXT NOT NULL,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_cards_book_id ON cards (book_id);
CREATE INDEX IF NOT EXISTS idx_cards_next_review ON cards (next_review);
CREATE INDEX IF NOT EXISTS idx_cards_incorrect_answers ON cards (book_id, json_array_length(incorrect_answers));
CREATE INDEX IF NOT EXISTS idx_sections_book_id ON sections (book_id);
