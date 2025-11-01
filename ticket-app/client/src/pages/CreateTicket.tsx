import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface Department {
  id: number;
  name: string;
  description: string;
}

const CreateTicket = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'request',
    priority: 'medium',
    department_id: ''
  });
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data);
      if (response.data.length > 0) {
        setFormData(prev => ({ ...prev, department_id: response.data[0].id.toString() }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load departments';
      setError(errorMessage);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.title.trim()) {
      setError('Please enter a ticket title');
      setLoading(false);
      return;
    }

    if (!formData.description.trim()) {
      setError('Please enter a description');
      setLoading(false);
      return;
    }

    try {
      const ticketData = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        priority: formData.priority,
        department_id: parseInt(formData.department_id),
        user_id: user?.id
      };

      await api.post('/tickets', ticketData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/user/tickets');
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create ticket';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (success) {
    return (
      <div style={styles.container}>
        <div style={styles.successCard}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>✓</div>
          <h2 style={{ color: '#10b981', marginBottom: '10px' }}>Ticket Created Successfully!</h2>
          <p style={{ color: '#6b7280' }}>Redirecting to your tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Create New Ticket</h1>
          <p style={styles.subtitle}>Submit a support request and our team will assist you</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && (
            <div style={styles.errorBox}>
              {error}
            </div>
          )}

          <div style={styles.formGroup}>
            <label style={styles.label}>
              Ticket Title <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Brief summary of your issue"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              Description <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Provide detailed information about your issue..."
              style={styles.textarea}
              rows={6}
              required
            />
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                style={styles.select}
              >
                <option value="request">Request</option>
                <option value="question">Question</option>
                <option value="incident">Incident</option>
                <option value="problem">Problem</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Priority</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                style={styles.select}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Department</label>
            <select
              name="department_id"
              value={formData.department_id}
              onChange={handleChange}
              style={styles.select}
            >
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            {departments.length === 0 && (
              <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '5px' }}>
                Loading departments...
              </p>
            )}
          </div>

          <div style={styles.buttonGroup}>
            <button
              type="button"
              onClick={() => navigate('/user/dashboard')}
              style={styles.cancelButton}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px'
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
    padding: '40px',
    width: '100%',
    maxWidth: '700px'
  },
  successCard: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
    padding: '60px',
    textAlign: 'center' as const
  },
  header: {
    marginBottom: '30px',
    textAlign: 'center' as const
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '10px'
  },
  subtitle: {
    fontSize: '16px',
    color: '#6b7280'
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  },
  input: {
    padding: '12px',
    fontSize: '16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  textarea: {
    padding: '12px',
    fontSize: '16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
    transition: 'border-color 0.2s'
  },
  select: {
    padding: '12px',
    fontSize: '16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    backgroundColor: 'white',
    cursor: 'pointer',
    transition: 'border-color 0.2s'
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    border: '1px solid #ef4444',
    color: '#dc2626',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '14px'
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginTop: '10px'
  },
  cancelButton: {
    flex: 1,
    padding: '14px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  submitButton: {
    flex: 2,
    padding: '14px',
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
  }
};

export default CreateTicket;
