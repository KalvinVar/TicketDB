import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface Ticket {
  id: number;
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  department_id: number;
  department_name?: string;
  user_id?: number;
  assigned_to?: number;
  resolution_notes?: string;
}

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

const ManageTickets = () => {
  const navigate = useNavigate();
  const { employee, token, logout, hasPermission } = useAuth();
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [closeMode, setCloseMode] = useState(false);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    status: '',
    priority: '',
    assigned_to: '',
  });
  
  // Close form state
  const [closeForm, setCloseForm] = useState({
    resolution_notes: ''
  });

  useEffect(() => {
    fetchTickets();
    if (hasPermission('assign_tickets')) {
      fetchEmployees();
    }
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tickets', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setTickets(response.data);
      setError('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tickets';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setEmployees(response.data);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  };

  const handleEdit = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setEditForm({
      status: ticket.status,
      priority: ticket.priority,
      assigned_to: ticket.assigned_to?.toString() || '',
    });
    setEditMode(true);
    setCloseMode(false);
  };

  const handleCloseTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setCloseForm({ resolution_notes: '' });
    setCloseMode(true);
    setEditMode(false);
  };

  const submitEdit = async () => {
    if (!selectedTicket) return;

    try {
      const updateData: any = {};
      if (editForm.status !== selectedTicket.status) {
        updateData.status = editForm.status;
      }
      if (editForm.priority !== selectedTicket.priority) {
        updateData.priority = editForm.priority;
      }
      if (editForm.assigned_to && editForm.assigned_to !== selectedTicket.assigned_to?.toString()) {
        updateData.assigned_to = parseInt(editForm.assigned_to);
      }

      await api.put(`/tickets/${selectedTicket.id}`, updateData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setEditMode(false);
      setSelectedTicket(null);
      fetchTickets();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update ticket';
      setError(errorMessage);
    }
  };

  const submitClose = async () => {
    if (!selectedTicket) return;

    if (!closeForm.resolution_notes.trim()) {
      setError('Resolution notes are required');
      return;
    }

    try {
      await api.patch(`/tickets/${selectedTicket.id}/close`, {
        resolution_notes: closeForm.resolution_notes,
        employee_id: employee?.id
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setCloseMode(false);
      setSelectedTicket(null);
      fetchTickets();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to close ticket';
      setError(errorMessage);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/employee/login');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open': return '#3b82f6';
      case 'in_progress': return '#f59e0b';
      case 'pending': return '#8b5cf6';
      case 'closed': return '#10b981';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>🎫 Manage Tickets</h1>
          <p style={styles.welcome}>
            {employee?.first_name} {employee?.last_name} - {tickets.length} ticket(s)
          </p>
        </div>
        <div style={styles.headerRight}>
          <button
            onClick={() => navigate('/employee/dashboard')}
            style={styles.backButton}
          >
            ← Dashboard
          </button>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {error && (
          <div style={styles.errorBox}>
            {error}
            <button onClick={() => setError('')} style={styles.dismissButton}>
              ✕
            </button>
          </div>
        )}

        {tickets.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>📭</div>
            <h2 style={{ color: '#374151', marginBottom: '10px' }}>No Tickets</h2>
            <p style={{ color: '#6b7280' }}>No tickets to manage at the moment.</p>
          </div>
        ) : (
          <div style={styles.ticketGrid}>
            {tickets.map(ticket => (
              <div key={ticket.id} style={styles.ticketCard}>
                <div style={styles.ticketHeader}>
                  <span style={styles.ticketId}>#{ticket.id}</span>
                  <div style={styles.badges}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: getPriorityColor(ticket.priority),
                    }}>
                      {ticket.priority}
                    </span>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: getStatusColor(ticket.status),
                    }}>
                      {ticket.status}
                    </span>
                  </div>
                </div>
                
                <h3 style={styles.ticketTitle}>{ticket.title}</h3>
                
                <p style={styles.ticketDescription}>
                  {ticket.description && ticket.description.length > 100
                    ? ticket.description.substring(0, 100) + '...'
                    : ticket.description || 'No description'}
                </p>

                {ticket.department_name && (
                  <p style={styles.ticketDepartment}>
                    📁 {ticket.department_name}
                  </p>
                )}
                
                <div style={styles.ticketActions}>
                  {hasPermission('edit_tickets') && ticket.status !== 'closed' && (
                    <button
                      onClick={() => handleEdit(ticket)}
                      style={styles.actionButton}
                    >
                      ✏️ Edit
                    </button>
                  )}
                  {hasPermission('close_tickets') && ticket.status !== 'closed' && (
                    <button
                      onClick={() => handleCloseTicket(ticket)}
                      style={{...styles.actionButton, ...styles.closeButton}}
                    >
                      ✓ Close
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editMode && selectedTicket && (
        <div style={styles.modalOverlay} onClick={() => setEditMode(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Edit Ticket #{selectedTicket.id}</h2>
              <button
                onClick={() => setEditMode(false)}
                style={styles.closeButtonX}
              >
                ✕
              </button>
            </div>
            
            <div style={styles.modalContent}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                  style={styles.select}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Priority</label>
                <select
                  value={editForm.priority}
                  onChange={(e) => setEditForm({...editForm, priority: e.target.value})}
                  style={styles.select}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              {hasPermission('assign_tickets') && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Assign To</label>
                  <select
                    value={editForm.assigned_to}
                    onChange={(e) => setEditForm({...editForm, assigned_to: e.target.value})}
                    style={styles.select}
                  >
                    <option value="">Unassigned</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={styles.buttonGroup}>
                <button
                  onClick={() => setEditMode(false)}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  onClick={submitEdit}
                  style={styles.submitButton}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Close Modal */}
      {closeMode && selectedTicket && (
        <div style={styles.modalOverlay} onClick={() => setCloseMode(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Close Ticket #{selectedTicket.id}</h2>
              <button
                onClick={() => setCloseMode(false)}
                style={styles.closeButtonX}
              >
                ✕
              </button>
            </div>
            
            <div style={styles.modalContent}>
              <div style={styles.infoBox}>
                <strong>Title:</strong> {selectedTicket.title}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Resolution Notes <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  value={closeForm.resolution_notes}
                  onChange={(e) => setCloseForm({resolution_notes: e.target.value})}
                  placeholder="Describe how the issue was resolved..."
                  style={styles.textarea}
                  rows={5}
                  required
                />
              </div>

              <div style={styles.buttonGroup}>
                <button
                  onClick={() => setCloseMode(false)}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  onClick={submitClose}
                  style={styles.submitButton}
                >
                  Close Ticket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
  },
  header: {
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    padding: '24px 48px',
    boxShadow: '0 4px 20px rgba(245, 158, 11, 0.3)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  headerRight: {
    display: 'flex',
    gap: '12px',
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
  backButton: {
    padding: '12px 24px',
    background: 'rgba(255, 255, 255, 0.9)',
    color: '#92400e',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s',
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
    maxWidth: '1400px',
    margin: '40px auto',
    padding: '0 40px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    color: '#6b7280',
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #f3f4f6',
    borderTop: '4px solid #10b981',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    border: '1px solid #ef4444',
    color: '#dc2626',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dismissButton: {
    background: 'none',
    border: 'none',
    color: '#dc2626',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '0 8px',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '80px 20px',
  },
  ticketGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
    gap: '24px',
  },
  ticketCard: {
    background: 'white',
    padding: '24px',
    borderRadius: '20px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
    border: '2px solid transparent',
    transition: 'all 0.3s',
  },
  ticketHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  ticketId: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b7280',
  },
  badges: {
    display: 'flex',
    gap: '8px',
  },
  badge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white',
    textTransform: 'uppercase' as const,
  },
  ticketTitle: {
    fontSize: '19px',
    fontWeight: '800',
    color: '#111827',
    marginBottom: '12px',
    lineHeight: '1.4',
  },
  ticketDescription: {
    fontSize: '15px',
    color: '#6b7280',
    lineHeight: '1.6',
    marginBottom: '14px',
  },
  ticketDepartment: {
    fontSize: '13px',
    color: '#f59e0b',
    fontWeight: '700',
    marginBottom: '18px',
  },
  ticketActions: {
    display: 'flex',
    gap: '12px',
    paddingTop: '16px',
    borderTop: '2px solid #f3f4f6',
  },
  actionButton: {
    flex: 1,
    padding: '12px 16px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
  },
  closeButton: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'white',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '80vh',
    overflow: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  modalHeader: {
    padding: '24px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#111827',
    margin: 0,
  },
  closeButtonX: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  modalContent: {
    padding: '24px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px',
  },
  select: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
  },
  infoBox: {
    background: '#f9fafb',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    color: '#374151',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
  },
  cancelButton: {
    flex: 1,
    padding: '12px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  submitButton: {
    flex: 2,
    padding: '12px',
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',
    background: '#10b981',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
};

export default ManageTickets;
