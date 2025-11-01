import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const EmployeeDashboard: React.FC = () => {
  const { employee, logout, isAdmin, token, hasPermission, refreshEmployeePermissions } = useAuth();
  const navigate = useNavigate();
  const [permissionNames, setPermissionNames] = useState<{ [key: number]: string }>({});
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  useEffect(() => {
    // Fetch permission names to map IDs to display names
    const fetchPermissions = async () => {
      try {
        const response = await api.get('/permissions', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const mapping: { [key: number]: string } = {};
        response.data.forEach((perm: any) => {
          mapping[perm.id] = perm.name;
        });
        setPermissionNames(mapping);
      } catch (err) {
        console.error('Failed to fetch permissions:', err);
      }
    };

    if (token) {
      fetchPermissions();
    }
  }, [token]);

  const handleLogout = () => {
    logout();
    navigate('/employee/login');
  };

  const handleRefreshPermissions = async () => {
    setRefreshing(true);
    setRefreshMessage(null);
    try {
      await refreshEmployeePermissions();
      setRefreshMessage('Permissions updated successfully! 🎉');
      // Refresh the page to update all UI components
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      setRefreshMessage(error.message || 'Failed to refresh permissions');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>🎫 Employee Dashboard</h1>
          <p style={styles.welcome}>
            {employee?.first_name} {employee?.last_name} • {employee?.role} • {employee?.department_name}
          </p>
        </div>
        <div style={styles.headerRight}>
          <button 
            onClick={handleRefreshPermissions} 
            style={styles.refreshButton}
            disabled={refreshing}
          >
            {refreshing ? '🔄 Refreshing...' : '🔄 Refresh Permissions'}
          </button>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>
      </div>

      {refreshMessage && (
        <div style={{
          ...styles.messageBar,
          backgroundColor: refreshMessage.includes('successfully') ? '#d1fae5' : '#fee2e2',
          color: refreshMessage.includes('successfully') ? '#065f46' : '#991b1b',
        }}>
          {refreshMessage}
        </div>
      )}

      <div style={styles.content}>
        {(hasPermission('view_tickets') || hasPermission('view_all_tickets')) && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Ticket Management</h2>
            <p style={styles.cardText}>
              View, edit, assign, close, and manage all support tickets with advanced filtering.
            </p>
            <button
              onClick={() => navigate('/employee/tickets')}
              style={styles.primaryButton}
            >
              Manage Tickets
            </button>
          </div>
        )}

        {(isAdmin || hasPermission('manage_employees')) && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Employee Management</h2>
            <p style={styles.cardText}>
              {isAdmin 
                ? 'Manage employee permissions, roles, and department assignments (full control).' 
                : employee?.role === 'manager'
                ? 'Manage employees in your department (limited access).'
                : 'Manage employee permissions and roles (cannot assign admin role).'}
            </p>
            <button
              onClick={() => navigate('/employee/manage-employees')}
              style={styles.primaryButton}
            >
              Manage Employees
            </button>
          </div>
        )}

        {(isAdmin || hasPermission('admin_access') || hasPermission('view_audit_logs')) && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>🔒 Security Audit Logs</h2>
            <p style={styles.cardText}>
              {isAdmin || hasPermission('admin_access')
                ? 'View comprehensive security logs of all sensitive actions including employee changes, permission updates, and system events.'
                : employee?.role === 'manager'
                ? 'View security logs for yourself and employees in your department.'
                : employee?.role === 'agent'
                ? 'View security logs for yourself and other agents.'
                : 'View your own security audit logs.'}
            </p>
            <button
              onClick={() => navigate('/employee/audit-logs')}
              style={styles.primaryButton}
            >
              View Audit Logs
            </button>
          </div>
        )}

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>My Permissions</h2>
          <div style={styles.permissions}>
            {employee?.permissions.map((permission) => {
              // Handle both permission IDs (numbers) and permission names (strings)
              let displayText: string;
              if (typeof permission === 'number') {
                displayText = permissionNames[permission] || `Permission ${permission}`;
              } else {
                displayText = permission;
              }
              
              return (
                <span key={permission} style={styles.badge}>
                  {displayText.replace(/_/g, ' ')}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    background: '#f9fafb',
  },
  header: {
    background: 'white',
    padding: '20px 40px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
  },
  headerRight: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#111827',
    margin: 0,
  },
  welcome: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '4px 0 0 0',
  },
  refreshButton: {
    padding: '10px 20px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  logoutButton: {
    padding: '10px 20px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  content: {
    maxWidth: '1200px',
    margin: '40px auto',
    padding: '0 40px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '30px',
  },
  card: {
    background: 'white',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#111827',
    margin: '0 0 10px 0',
  },
  cardText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 20px 0',
  },
  primaryButton: {
    padding: '12px 24px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
  },
  permissions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '16px',
  },
  badge: {
    padding: '4px 12px',
    background: '#dbeafe',
    color: '#1e40af',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  messageBar: {
    padding: '12px 40px',
    fontSize: '14px',
    fontWeight: '600',
    textAlign: 'center',
    margin: '0',
  },
};

export default EmployeeDashboard;
