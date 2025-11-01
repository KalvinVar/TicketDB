import { db } from '../config/database';

/**
 * Creates audit_logs table for tracking security-sensitive actions
 * Run this migration before starting the server
 */
export const createAuditLogsTable = () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER,
      action_type VARCHAR(50) NOT NULL,
      action_description TEXT NOT NULL,
      target_type VARCHAR(50),
      target_id INTEGER,
      ip_address VARCHAR(45),
      user_agent TEXT,
      request_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    );
  `;

  const createIndexQuery = `
    CREATE INDEX IF NOT EXISTS idx_audit_logs_employee 
    ON audit_logs(employee_id);
  `;

  const createIndexQuery2 = `
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action 
    ON audit_logs(action_type);
  `;

  const createIndexQuery3 = `
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created 
    ON audit_logs(created_at);
  `;

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(createTableQuery, (err) => {
        if (err) {
          console.error('Error creating audit_logs table:', err);
          reject(err);
          return;
        }
        console.log('✓ audit_logs table created/verified');
      });

      db.run(createIndexQuery, (err) => {
        if (err) console.error('Error creating index:', err);
      });

      db.run(createIndexQuery2, (err) => {
        if (err) console.error('Error creating index:', err);
      });

      db.run(createIndexQuery3, (err) => {
        if (err) {
          console.error('Error creating index:', err);
          reject(err);
          return;
        }
        console.log('✓ audit_logs indexes created');
        resolve(true);
      });
    });
  });
};

// Auto-run migration when imported
createAuditLogsTable().catch(console.error);
