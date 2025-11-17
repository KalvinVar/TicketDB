import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

// Debounce timer for ML predictions
let debounceTimer: ReturnType<typeof setTimeout>;

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
  const [showMLSuggestions, setShowMLSuggestions] = useState(false);
  const [mlPredictions, setMlPredictions] = useState<any>(null);
  const [mlLoading, setMlLoading] = useState(false);

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

      console.log('Submitting ticket data:', ticketData);

      await api.post('/tickets', ticketData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/user/tickets');
      }, 2000);
    } catch (err: any) {
      console.error('Ticket creation error:', err);
      console.error('Error response:', err.response?.data);
      
      // Extract detailed validation errors if available
      if (err.response?.data?.details) {
        const validationErrors = err.response.data.details
          .map((detail: any) => `${detail.path}: ${detail.msg}`)
          .join(', ');
        setError(`Validation failed: ${validationErrors}`);
      } else {
        const errorMessage = err.response?.data?.error || err.message || 'Failed to create ticket';
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    
    // Auto-fetch ML predictions when description has enough content (with debounce)
    if (showMLSuggestions && (e.target.name === 'title' || e.target.name === 'description')) {
      const title = e.target.name === 'title' ? e.target.value : formData.title;
      const description = e.target.name === 'description' ? e.target.value : formData.description;
      
      if (title.length > 10 || description.length > 50) {
        // Clear previous timer
        clearTimeout(debounceTimer);
        
        // Set new timer - wait 800ms after user stops typing
        debounceTimer = setTimeout(() => {
          fetchMLPredictions(title, description);
        }, 800);
      }
    }
  };

  const fetchMLPredictions = async (title: string, description: string) => {
    if (!title && !description) return;
    if (!showMLSuggestions) return; // Don't fetch if toggle is off
    
    setMlLoading(true);
    try {
      const response = await api.post('/ml/predict-full', 
        { title, description },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      console.log('ML Predictions received:', response.data);
      setMlPredictions(response.data);
    } catch (err) {
      console.error('ML prediction failed:', err);
      // Silently fail - don't show ML errors to user
      setMlPredictions(null);
    } finally {
      setMlLoading(false);
    }
  };

  const applyMLSuggestion = (field: string, value: string) => {
    console.log(`Applying ML suggestion: ${field} = ${value}`);
    setFormData(prev => ({ ...prev, [field]: value }));
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
          
          <button
            type="button"
            onClick={() => {
              setShowMLSuggestions(!showMLSuggestions);
              if (!showMLSuggestions && (formData.title || formData.description)) {
                fetchMLPredictions(formData.title, formData.description);
              }
            }}
            style={{
              ...styles.mlToggleButton,
              background: showMLSuggestions 
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'
            }}
          >
            🤖 {showMLSuggestions ? 'Hide' : 'Show'} ML Suggestions
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && (
            <div style={styles.errorBox}>
              {error}
            </div>
          )}

          {showMLSuggestions && (
            <div style={styles.mlSuggestionsBox}>
              <div style={styles.mlHeader}>
                <span style={{ fontSize: '18px', fontWeight: '600' }}>🤖 AI Suggestions</span>
                {mlLoading && <span style={{ fontSize: '14px', color: '#6b7280' }}>Analyzing...</span>}
              </div>
              
              {mlPredictions && !mlLoading ? (
                <div style={styles.mlContent}>
                  {/* Type Prediction */}
                  {mlPredictions.category?.type && (
                    <div style={styles.mlSuggestion}>
                      <div style={styles.mlLabel}>
                        <span>Suggested Type:</span>
                        <span style={styles.mlConfidence}>
                          {(mlPredictions.category.type.confidence * 100).toFixed(0)}% confident
                        </span>
                      </div>
                      <div style={styles.mlValue}>
                        <strong style={{ textTransform: 'capitalize' }}>
                          {mlPredictions.category.type.prediction}
                        </strong>
                        {formData.type !== mlPredictions.category.type.prediction && (
                          <button
                            type="button"
                            onClick={() => applyMLSuggestion('type', mlPredictions.category.type.prediction)}
                            style={styles.applyButton}
                          >
                            Apply
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Priority Prediction */}
                  {mlPredictions.category?.priority && (
                    <div style={styles.mlSuggestion}>
                      <div style={styles.mlLabel}>
                        <span>Suggested Priority:</span>
                        <span style={styles.mlConfidence}>
                          {(mlPredictions.category.priority.confidence * 100).toFixed(0)}% confident
                        </span>
                      </div>
                      <div style={styles.mlValue}>
                        <strong style={{ textTransform: 'capitalize' }}>
                          {mlPredictions.category.priority.prediction}
                        </strong>
                        {formData.priority !== mlPredictions.category.priority.prediction && (
                          <button
                            type="button"
                            onClick={() => applyMLSuggestion('priority', mlPredictions.category.priority.prediction)}
                            style={styles.applyButton}
                          >
                            Apply
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Sentiment Analysis */}
                  {mlPredictions.sentiment && (
                    <div style={styles.mlSuggestion}>
                      <div style={styles.mlLabel}>
                        <span>Sentiment Analysis:</span>
                      </div>
                      <div style={styles.sentimentBadge}>
                        <span style={{ fontSize: '20px', marginRight: '8px' }}>
                          {mlPredictions.sentiment.emotion === 'angry' ? '😡' :
                           mlPredictions.sentiment.emotion === 'frustrated' ? '😤' :
                           mlPredictions.sentiment.emotion === 'concerned' ? '😟' :
                           mlPredictions.sentiment.emotion === 'satisfied' ? '😊' : '😐'}
                        </span>
                        <div>
                          <div style={{ fontWeight: '600', textTransform: 'capitalize' }}>
                            {mlPredictions.sentiment.emotion}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            {mlPredictions.sentiment.sentiment} ({(mlPredictions.sentiment.score * 100).toFixed(0)}%)
                          </div>
                        </div>
                        {mlPredictions.sentiment.urgency_flag && (
                          <span style={styles.urgencyBadge}>⚠️ High Urgency</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : !mlLoading ? (
                <p style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center', padding: '20px' }}>
                  Start typing your title and description to see AI suggestions...
                </p>
              ) : null}
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
  },
  mlToggleButton: {
    marginTop: '15px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
  },
  mlSuggestionsBox: {
    backgroundColor: '#f0f9ff',
    border: '2px solid #0ea5e9',
    borderRadius: '10px',
    padding: '20px',
    marginTop: '10px'
  },
  mlHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    color: '#0c4a6e'
  },
  mlContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px'
  },
  mlSuggestion: {
    backgroundColor: 'white',
    padding: '15px',
    borderRadius: '8px',
    border: '1px solid #e0f2fe'
  },
  mlLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
    color: '#64748b',
    marginBottom: '8px'
  },
  mlConfidence: {
    fontSize: '12px',
    padding: '3px 8px',
    backgroundColor: '#dbeafe',
    borderRadius: '4px',
    color: '#1e40af'
  },
  mlValue: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '16px',
    color: '#1e293b'
  },
  applyButton: {
    padding: '6px 16px',
    fontSize: '13px',
    fontWeight: '600',
    color: 'white',
    backgroundColor: '#0ea5e9',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  sentimentBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px',
    backgroundColor: '#f8fafc',
    borderRadius: '6px'
  },
  urgencyBadge: {
    marginLeft: 'auto',
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    borderRadius: '6px'
  }
};

export default CreateTicket;
