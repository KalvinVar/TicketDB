import sqlite3 from 'sqlite3';
import path from 'path';

// Point to the data folder in the root ITDB directory
const dbPath = path.join(__dirname, '../../../../data/english_support_tickets.db');

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    console.error('Attempted path:', dbPath);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
  }
});