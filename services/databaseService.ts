import * as sqlite3 from 'sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

export class DatabaseService {
    private static instance: DatabaseService;
    private db: sqlite3.Database;

    private constructor() {
        const dbPath = join(process.cwd(), 'database', 'learning_progress.db');
        this.db = new sqlite3.Database(dbPath);
        this.initializeDatabase();
    }

    public static getInstance(): DatabaseService {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }

    private async initializeDatabase(): Promise<void> {
        return new Promise((resolve, reject) => {
            const initSqlPath = join(process.cwd(), 'database', 'init.sql');
            const initSql = readFileSync(initSqlPath, 'utf-8');
            
            this.db.exec(initSql, (err) => {
                if (err) {
                    console.error('Error initializing database:', err);
                    reject(err);
                } else {
                    console.log('Database initialized successfully');
                    resolve();
                }
            });
        });
    }

    // 书籍操作
    public async createBook(id: string, title: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const now = Date.now();
            this.db.run(
                'INSERT OR REPLACE INTO books (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)',
                [id, title, now, now],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    public async getBook(id: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM books WHERE id = ?',
                [id],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    public async getAllBooks(): Promise<any[]> {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM books ORDER BY created_at DESC',
                [],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    public async deleteBook(id: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(
                'DELETE FROM books WHERE id = ?',
                [id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    public async updateBookTimestamp(id: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE books SET updated_at = ? WHERE id = ?',
                [Date.now(), id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    public async updateBookTitle(id: string, title: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE books SET title = ?, updated_at = ? WHERE id = ?',
                [title, Date.now(), id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    public async clearBookCards(bookId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(
                'DELETE FROM cards WHERE book_id = ?',
                [bookId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    public async deleteCard(cardId: number): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(
                'DELETE FROM cards WHERE id = ?',
                [cardId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    public async createCards(cards: any[]): Promise<void> {
        return new Promise((resolve, reject) => {
            const now = Date.now();
            const stmt = this.db.prepare(`
                INSERT INTO cards (
                    book_id, chinese, english, memory_level, last_reviewed, 
                    next_review, incorrect_answers, is_skipped, correct_streak, 
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION');
                
                cards.forEach(card => {
                    stmt.run([
                        card.bookId,
                        card.chinese,
                        card.english,
                        card.memoryLevel || 1,
                        card.lastReviewed || null,
                        card.nextReview,
                        JSON.stringify(card.incorrectAnswers || []),
                        card.isSkipped || false,
                        card.correctStreak || 0,
                        now,
                        now
                    ]);
                });

                this.db.run('COMMIT', (err) => {
                    stmt.finalize();
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        });
    }

    // 卡片操作
    public async createCard(card: any): Promise<void> {
        return new Promise((resolve, reject) => {
            const now = Date.now();
            this.db.run(
                `INSERT INTO cards (
                    book_id, chinese, english, memory_level, last_reviewed, 
                    next_review, incorrect_answers, is_skipped, correct_streak, 
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    card.bookId,
                    card.chinese,
                    card.english,
                    card.memoryLevel || 1,
                    card.lastReviewed || null,
                    card.nextReview,
                    JSON.stringify(card.incorrectAnswers || []),
                    card.isSkipped || false,
                    card.correctStreak || 0,
                    now,
                    now
                ],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    public async updateCard(cardId: number, updates: any): Promise<void> {
        return new Promise((resolve, reject) => {
            const setClause = Object.keys(updates)
                .map(key => `${key} = ?`)
                .join(', ');
            const values = Object.values(updates);
            
            this.db.run(
                `UPDATE cards SET ${setClause}, updated_at = ? WHERE id = ?`,
                [...values, Date.now(), cardId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    public async getCardsByBookId(bookId: string): Promise<any[]> {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM cards WHERE book_id = ? ORDER BY created_at',
                [bookId],
                (err, rows) => {
                    if (err) reject(err);
                    else {
                        // 解析JSON字段
                        const cards = rows.map((row: any) => ({
                            ...row,
                            incorrectAnswers: JSON.parse(row.incorrect_answers),
                            isSkipped: Boolean(row.is_skipped)
                        }));
                        resolve(cards);
                    }
                }
            );
        });
    }

    public async getDueCards(bookId: string): Promise<any[]> {
        return new Promise((resolve, reject) => {
            const now = Date.now();
            this.db.all(
                'SELECT * FROM cards WHERE book_id = ? AND next_review <= ? AND is_skipped = FALSE ORDER BY next_review',
                [bookId, now],
                (err, rows) => {
                    if (err) reject(err);
                    else {
                        const cards = rows.map((row: any) => ({
                            ...row,
                            incorrectAnswers: JSON.parse(row.incorrect_answers),
                            isSkipped: Boolean(row.is_skipped)
                        }));
                        resolve(cards);
                    }
                }
            );
        });
    }

    public async getMistakeCards(bookId: string): Promise<any[]> {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM cards WHERE book_id = ? AND json_array_length(incorrect_answers) > 0 ORDER BY last_reviewed ASC',
                [bookId],
                (err, rows) => {
                    if (err) reject(err);
                    else {
                        const cards = rows.map((row: any) => ({
                            ...row,
                            incorrectAnswers: JSON.parse(row.incorrect_answers),
                            isSkipped: Boolean(row.is_skipped)
                        }));
                        resolve(cards);
                    }
                }
            );
        });
    }

    public async deleteCardsByBookId(bookId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(
                'DELETE FROM cards WHERE book_id = ?',
                [bookId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    // 章节操作（保持原有文件结构）
    public async createSection(bookId: string, name: string, content: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const now = Date.now();
            this.db.run(
                'INSERT OR REPLACE INTO sections (book_id, name, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
                [bookId, name, content, now, now],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    public async getSectionsByBookId(bookId: string): Promise<any[]> {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM sections WHERE book_id = ? ORDER BY created_at',
                [bookId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    public async updateSection(bookId: string, name: string, content: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE sections SET content = ?, updated_at = ? WHERE book_id = ? AND name = ?',
                [content, Date.now(), bookId, name],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    public async deleteSection(bookId: string, name: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(
                'DELETE FROM sections WHERE book_id = ? AND name = ?',
                [bookId, name],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    public async deleteSectionsByBookId(bookId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(
                'DELETE FROM sections WHERE book_id = ?',
                [bookId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    // 关闭数据库连接
    public close(): void {
        this.db.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
            } else {
                console.log('Database connection closed');
            }
        });
    }
}
