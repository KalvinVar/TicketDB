import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const EmployeeLogin: React.FC = () => {
  const [email, setEmail] = useState('admin@ticketdb.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginEmployee } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await loginEmployee(email, password);
      navigate('/employee/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillAgent = () => {
    setEmail('agent@ticketdb.com');
    setPassword('agent123');
  };

  const fillAdmin = () => {
    setEmail('admin@ticketdb.com');
    setPassword('admin123');
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>🎫 TicketDB</h1>
          <h2 style={styles.subtitle}>Employee Portal</h2>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}

          <div style={styles.formGroup}>
            <label style={styles.label}>
              Email
              <span style={styles.quickFill}>
                <span onClick={fillAdmin} style={styles.fillButton}>Admin</span>
                {' | '}
                <span onClick={fillAgent} style={styles.fillButton}>Agent</span>
              </span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
              disabled={loading}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            style={{
              ...styles.button,
              ...(loading ? styles.buttonDisabled : {}),
            }}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <div style={styles.links}>
            <a href="/user/login" style={styles.link}>
              ← Customer Login
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    padding: '20px',
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    width: '100%',
    maxWidth: '400px',
    padding: '40px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 10px 0',
  },
  subtitle: {
    fontSize: '18px',
    color: '#666',
    fontWeight: 'normal',
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickFill: {
    fontSize: '12px',
    fontWeight: 'normal',
    color: '#10b981',
  },
  fillButton: {
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  input: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.3s',
  },
  button: {
    padding: '14px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.3s',
  },
  buttonDisabled: {
    background: '#ccc',
    cursor: 'not-allowed',
  },
  error: {
    padding: '12px',
    background: '#fee2e2',
    color: '#dc2626',
    borderRadius: '6px',
    fontSize: '14px',
    borderLeft: '4px solid #dc2626',
  },
  links: {
    textAlign: 'center',
    marginTop: '10px',
  },
  link: {
    color: '#10b981',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '600',
  },
};

export default EmployeeLogin;
