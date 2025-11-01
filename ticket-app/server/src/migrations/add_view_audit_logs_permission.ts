import { db } from '../config/database';

/**
 * Migration: Add view_audit_logs permission
 */
export const addViewAuditLogsPermission = () => {
  console.log('Running migration: add_view_audit_logs_permission...');

  // Check if permission already exists
  db.get(
    'SELECT id FROM permissions WHERE name = ?',
    ['view_audit_logs'],
    (err, row) => {
      if (err) {
        console.error('Error checking for view_audit_logs permission:', err);
        return;
      }

      if (row) {
        console.log('✓ view_audit_logs permission already exists');
        return;
      }

      // Insert the new permission
      db.run(
        `INSERT INTO permissions (name, description, resource, action) 
         VALUES (?, ?, ?, ?)`,
        [
          'view_audit_logs',
          'Can view audit logs based on role: Admins see all, Managers see department, Agents see agents',
          'audit_logs',
          'read'
        ],
        function (err) {
          if (err) {
            console.error('Error adding view_audit_logs permission:', err);
          } else {
            console.log('✓ view_audit_logs permission added successfully (ID:', this.lastID, ')');
          }
        }
      );
    }
  );
};
