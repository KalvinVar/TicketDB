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

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>📚 Knowledge Base</h2>
          <p style={styles.cardText}>
            Browse helpful articles and find answers to common questions.
          </p>
          <button
            onClick={() => navigate('/user/knowledge-base')}
            style={styles.secondaryButton}
          >
            Browse Articles
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
  },
  header: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '24px 48px',
    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
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
    border: '1px solid rgba(102, 126, 234, 0.1)',
    transition: 'all 0.3s',
  },
  cardTitle: {
    fontSize: '24px',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    width: '100%',
    transition: 'all 0.3s',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
  },
  secondaryButton: {
    padding: '14px 28px',
    background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
    color: '#374151',
    border: '2px solid #d1d5db',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    width: '100%',
    transition: 'all 0.3s',
  },
};

export default UserDashboard;
