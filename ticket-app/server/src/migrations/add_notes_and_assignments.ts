import { db } from '../config/database';

/**
 * Migration: Add ticket_notes and ticket_assignments tables
 * 
 * ticket_notes: Stores notes with visibility control
 * ticket_assignments: Tracks ticket creator and current assignee with history
 */

const migration = () => {
  console.log('Starting migration: add_notes_and_assignments...');

  db.serialize(() => {
    // Create ticket_notes table
    db.run(`
      CREATE TABLE IF NOT EXISTS ticket_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER NOT NULL,
        employee_id INTEGER NOT NULL,
        note_text TEXT NOT NULL,
        is_internal BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ticket_id) REFERENCES tickets(rowid),
        FOREIGN KEY (employee_id) REFERENCES employees(id)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating ticket_notes table:', err);
      } else {
        console.log('✓ Created ticket_notes table');
      }
    });

    // Create ticket_assignments table to track creator and assignee
    db.run(`
      CREATE TABLE IF NOT EXISTS ticket_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER NOT NULL,
        created_by_user_id INTEGER,
        created_by_employee_id INTEGER,
        assigned_to_employee_id INTEGER,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        assigned_by_employee_id INTEGER,
        FOREIGN KEY (ticket_id) REFERENCES tickets(rowid),
        FOREIGN KEY (created_by_user_id) REFERENCES users(id),
        FOREIGN KEY (created_by_employee_id) REFERENCES employees(id),
        FOREIGN KEY (assigned_to_employee_id) REFERENCES employees(id),
        FOREIGN KEY (assigned_by_employee_id) REFERENCES employees(id)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating ticket_assignments table:', err);
      } else {
        console.log('✓ Created ticket_assignments table');
      }
    });

    // Migrate existing ticket data to ticket_assignments
    db.run(`
      INSERT INTO ticket_assignments (ticket_id, created_by_user_id, assigned_to_employee_id)
      SELECT rowid, user_id, assigned_to
      FROM tickets
      WHERE NOT EXISTS (
        SELECT 1 FROM ticket_assignments WHERE ticket_id = tickets.rowid
      )
    `, (err) => {
      if (err) {
        console.error('Error migrating existing assignments:', err);
      } else {
        console.log('✓ Migrated existing ticket assignments');
      }
    });

    // Add create_tickets permission if not exists
    db.run(`
      INSERT OR IGNORE INTO permissions (name, description)
      VALUES ('create_tickets', 'Can create support tickets')
    `, (err) => {
      if (err) {
        console.error('Error adding create_tickets permission:', err);
      } else {
        console.log('✓ Added create_tickets permission');
      }
    });

    // Update existing roles to include create_tickets permission
    db.all(`SELECT id, name, permissions FROM roles WHERE name IN ('admin', 'manager', 'agent')`, [], (err, roles: any[]) => {
      if (err) {
        console.error('Error fetching roles:', err);
        return;
      }

      db.get(`SELECT id FROM permissions WHERE name = 'create_tickets'`, [], (err, perm: any) => {
        if (err || !perm) {
          console.error('Error fetching create_tickets permission:', err);
          return;
        }

        const createTicketsPerm = perm.id.toString();

        roles.forEach((role) => {
          const currentPerms = role.permissions ? role.permissions.split(',') : [];
          if (!currentPerms.includes(createTicketsPerm)) {
            currentPerms.push(createTicketsPerm);
            const updatedPerms = currentPerms.join(',');

            db.run(`UPDATE roles SET permissions = ? WHERE id = ?`, [updatedPerms, role.id], (err) => {
              if (err) {
                console.error(`Error updating role ${role.name}:`, err);
              } else {
                console.log(`✓ Added create_tickets to ${role.name} role`);
              }
            });
          }
        });

        console.log('Migration completed successfully!');
      });
    });
  });
};

// Run migration if this file is executed directly
if (require.main === module) {
  migration();
  // Close database after migration completes
  setTimeout(() => {
    db.close();
  }, 2000);
}

export default migration;
