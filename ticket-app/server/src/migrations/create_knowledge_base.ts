import { db } from '../config/database';

/**
 * Migration to create knowledge base articles table
 * Articles are published from resolved tickets
 */
export const createKnowledgeBaseTables = () => {
  return new Promise<void>((resolve, reject) => {
    db.serialize(() => {
      // Create kb_articles table
      db.run(`
        CREATE TABLE IF NOT EXISTS kb_articles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          category TEXT NOT NULL,
          tags TEXT,
          source_ticket_id INTEGER,
          created_by INTEGER,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          view_count INTEGER DEFAULT 0,
          helpful_count INTEGER DEFAULT 0,
          not_helpful_count INTEGER DEFAULT 0,
          is_published INTEGER DEFAULT 1,
          FOREIGN KEY (source_ticket_id) REFERENCES tickets(rowid),
          FOREIGN KEY (created_by) REFERENCES employees(id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating kb_articles table:', err);
          reject(err);
        } else {
          console.log('✅ kb_articles table created successfully');
        }
      });

      // Create kb_article_views table for tracking user views
      db.run(`
        CREATE TABLE IF NOT EXISTS kb_article_views (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          article_id INTEGER NOT NULL,
          user_id INTEGER,
          viewed_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (article_id) REFERENCES kb_articles(id),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating kb_article_views table:', err);
          reject(err);
        } else {
          console.log('✅ kb_article_views table created successfully');
          resolve();
        }
      });
    });
  });
};

// Auto-run migration
createKnowledgeBaseTables().catch(console.error);
