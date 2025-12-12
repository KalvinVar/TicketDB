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

        {(isAdmin || hasPermission('view_all_tickets')) && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>📊 Analytics Dashboard</h2>
            <p style={styles.cardText}>
              View comprehensive analytics including ticket trends, agent performance, department metrics, and resolution times with exportable reports.
            </p>
            <button
              onClick={() => navigate('/employee/analytics')}
              style={styles.primaryButton}
            >
              View Analytics
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
    background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
  },
  header: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    padding: '24px 48px',
    boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)',
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
    fontSize: '28px',
    fontWeight: '800',
    color: 'white',
    margin: 0,
  },
  welcome: {
    fontSize: '15px',
    color: 'rgba(255, 255, 255, 0.9)',
    margin: '6px 0 0 0',
    fontWeight: '500',
  },
  refreshButton: {
    padding: '12px 24px',
    background: 'rgba(59, 130, 246, 0.9)',
    color: 'white',
    border: '2px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s',
    backdropFilter: 'blur(10px)',
  },
  logoutButton: {
    padding: '12px 24px',
    background: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s',
    backdropFilter: 'blur(10px)',
  },
  content: {
    maxWidth: '1200px',
    margin: '48px auto',
    padding: '0 48px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '32px',
  },
  card: {
    background: 'white',
    padding: '36px',
    borderRadius: '20px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
    border: '1px solid rgba(16, 185, 129, 0.1)',
    transition: 'all 0.3s',
  },
  cardTitle: {
    fontSize: '24px',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: '0 0 12px 0',
  },
  cardText: {
    fontSize: '15px',
    color: '#6b7280',
    margin: '0 0 24px 0',
    lineHeight: '1.6',
  },
  primaryButton: {
    padding: '14px 28px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    width: '100%',
    transition: 'all 0.3s',
    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
  },
  permissions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginTop: '20px',
  },
  badge: {
    padding: '6px 16px',
    background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
    color: '#1e40af',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '700',
    textTransform: 'capitalize',
    border: '1px solid #93c5fd',
  },
  messageBar: {
    padding: '16px 48px',
    fontSize: '15px',
    fontWeight: '600',
    textAlign: 'center',
    margin: '0',
    borderRadius: '0',
  },
};

export default EmployeeDashboard;
