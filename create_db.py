import sqlite3
import os

# Use the existing data directory
data_dir = 'data'

# Connect to database (creates it if it doesn't exist)
db_path = os.path.join(data_dir, 'tickets.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Drop table if exists (for clean start)
cursor.execute('DROP TABLE IF EXISTS tickets')

# Create tickets table
cursor.execute('''
CREATE TABLE tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open',
    priority TEXT DEFAULT 'medium',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
''')

# Insert sample data
sample_tickets = [
    ('Login issue', 'Users cannot log in to the system', 'open', 'high'),
    ('Slow performance', 'Dashboard loads slowly', 'in_progress', 'medium'),
    ('Feature request', 'Add dark mode', 'open', 'low'),
    ('Email notification bug', 'Users not receiving email notifications', 'open', 'high'),
    ('UI improvement', 'Update button styles', 'closed', 'low'),
]

cursor.executemany('''
INSERT INTO tickets (title, description, status, priority)
VALUES (?, ?, ?, ?)
''', sample_tickets)

conn.commit()
conn.close()

print(f"Database created successfully at: {os.path.abspath(db_path)}")
print(f"Created {len(sample_tickets)} sample tickets")