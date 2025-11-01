import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const UserDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/user/login');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>🎫 My Tickets</h1>
          <p style={styles.welcome}>
            Welcome, {user?.first_name} {user?.last_name}
          </p>
        </div>
        <button onClick={handleLogout} style={styles.logoutButton}>
          Logout
        </button>
      </div>

      <div style={styles.content}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Create New Ticket</h2>
          <p style={styles.cardText}>
            Need help? Click the button below to create a support ticket.
          </p>
          <button
            onClick={() => navigate('/user/create-ticket')}
            style={styles.primaryButton}
          >
            Create Ticket
          </button>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>My Tickets</h2>
          <p style={styles.cardText}>
            View and track all your support tickets.
          </p>
          <button
            onClick={() => navigate('/user/tickets')}
            style={styles.secondaryButton}
          >
            View My Tickets
          </button>
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
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
  },
  secondaryButton: {
    padding: '12px 24px',
    background: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
  },
};

export default UserDashboard;
