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
  resolution_notes?: string;
  assignee_name?: string;
  created_at?: string;
  updated_at?: string;
}

interface TicketNote {
  id: number;
  ticket_id: number;
  employee_id: number;
  employee_name?: string;
  note_text: string;
  is_internal: boolean;
  created_at: string;
}

const UserTickets = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketNotes, setTicketNotes] = useState<TicketNote[]>([]);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  useEffect(() => {
    fetchUserTickets();
  }, []);

  const fetchUserTickets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tickets', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Filter tickets by user_id on the frontend (if backend doesn't filter)
      const userTickets = response.data.filter((t: any) => t.user_id === user?.id);
      setTickets(userTickets);
      setError('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tickets';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketNotes = async (ticketId: number) => {
    try {
      const response = await api.get(`/tickets/${ticketId}/notes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setTicketNotes(response.data);
    } catch (err) {
      console.error('Failed to fetch notes:', err);
      setTicketNotes([]);
    }
  };

  const handleViewTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    await fetchTicketNotes(ticket.id);
  };

  const handleLogout = () => {
    logout();
    navigate('/user/login');
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

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };
  
  // Get unique departments from tickets
  const departments = Array.from(new Set(tickets.map(t => t.department_name).filter(Boolean)));
  
  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = searchQuery === '' || 
      ticket.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    const matchesDepartment = departmentFilter === 'all' || ticket.department_name === departmentFilter;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesDepartment;
  });

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading your tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>🎫 My Tickets</h1>
          <p style={styles.welcome}>
            {user?.first_name} {user?.last_name} - {filteredTickets.length} of {tickets.length} ticket(s)
          </p>
        </div>
        <div style={styles.headerRight}>
          <button
            onClick={() => navigate('/user/dashboard')}
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
        {/* Filter Bar */}
        {tickets.length > 0 && (
          <div style={styles.filterBar}>
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
            
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={styles.select}>
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="pending">Pending</option>
              <option value="closed">Closed</option>
            </select>
            
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} style={styles.select}>
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            
            {departments.length > 0 && (
              <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} style={styles.select}>
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            )}
            
            <button onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setPriorityFilter('all');
              setDepartmentFilter('all');
            }} style={styles.clearButton}>
              Clear
            </button>
          </div>
        )}

        {/* Stats */}
        {tickets.length > 0 && (
          <div style={styles.stats}>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{filteredTickets.length}</div>
              <div style={styles.statLabel}>Showing</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{filteredTickets.filter(t => t.status === 'open').length}</div>
              <div style={styles.statLabel}>Open</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{filteredTickets.filter(t => t.status === 'in_progress').length}</div>
              <div style={styles.statLabel}>In Progress</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{filteredTickets.filter(t => t.status === 'closed').length}</div>
              <div style={styles.statLabel}>Resolved</div>
            </div>
          </div>
        )}

        {error && (
          <div style={styles.errorBox}>
            {error}
            <button onClick={fetchUserTickets} style={styles.retryButton}>
              Retry
            </button>
          </div>
        )}

        {tickets.length === 0 && !error && (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>📭</div>
            <h2 style={{ color: '#374151', marginBottom: '10px' }}>No Tickets Yet</h2>
            <p style={{ color: '#6b7280', marginBottom: '20px' }}>
              You haven't created any support tickets.
            </p>
            <button
              onClick={() => navigate('/user/create-ticket')}
              style={styles.createButton}
            >
              Create Your First Ticket
            </button>
          </div>
        )}
        
        {tickets.length > 0 && filteredTickets.length === 0 && (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔍</div>
            <h2 style={{ color: '#374151', marginBottom: '10px' }}>No Matching Tickets</h2>
            <p style={{ color: '#6b7280', marginBottom: '20px' }}>
              Try adjusting your filters
            </p>
          </div>
        )}

        {tickets.length > 0 && filteredTickets.length > 0 && (
          <div style={styles.ticketGrid}>
            {filteredTickets.map(ticket => (
              <div
                key={ticket.id}
                style={styles.ticketCard}
                onClick={() => handleViewTicket(ticket)}
              >
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
                  {ticket.description.length > 150
                    ? ticket.description.substring(0, 150) + '...'
                    : ticket.description}
                </p>
                
                <div style={styles.ticketFooter}>
                  <div style={styles.ticketMeta}>
                    <span style={styles.ticketType}>{ticket.type}</span>
                    {ticket.department_name && (
                      <span style={styles.ticketDepartment}>
                        📁 {ticket.department_name}
                      </span>
                    )}
                  </div>
                  <span style={styles.ticketDate}>
                    {ticket.created_at ? formatDate(ticket.created_at) : `Ticket #${ticket.id}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create New Ticket Button */}
        {tickets.length > 0 && (
          <button
            onClick={() => navigate('/user/create-ticket')}
            style={styles.floatingButton}
          >
            + New Ticket
          </button>
        )}
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div style={styles.modalOverlay} onClick={() => setSelectedTicket(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Ticket #{selectedTicket.id}</h2>
              <button
                onClick={() => setSelectedTicket(null)}
                style={styles.closeButton}
              >
                ✕
              </button>
            </div>
            
            <div style={styles.modalContent}>
              <div style={styles.modalBadges}>
                <span style={{
                  ...styles.badge,
                  backgroundColor: getPriorityColor(selectedTicket.priority),
                }}>
                  {selectedTicket.priority} priority
                </span>
                <span style={{
                  ...styles.badge,
                  backgroundColor: getStatusColor(selectedTicket.status),
                }}>
                  {selectedTicket.status}
                </span>
                <span style={styles.badgeOutline}>
                  {selectedTicket.type}
                </span>
                {selectedTicket.department_name && (
                  <span style={styles.badgeOutline}>
                    📁 {selectedTicket.department_name}
                  </span>
                )}
              </div>
              
              <div style={styles.modalSection}>
                <h3 style={styles.sectionTitle}>Title</h3>
                <p style={styles.sectionText}>{selectedTicket.title}</p>
              </div>
              
              <div style={styles.modalSection}>
                <h3 style={styles.sectionTitle}>Description</h3>
                <p style={styles.sectionText}>{selectedTicket.description}</p>
              </div>
              
              {selectedTicket.assignee_name && (
                <div style={styles.modalSection}>
                  <h3 style={styles.sectionTitle}>Assigned To</h3>
                  <p style={styles.sectionText}>👨‍💼 {selectedTicket.assignee_name}</p>
                </div>
              )}
              
              {selectedTicket.resolution_notes && (
                <div style={styles.resolutionSection}>
                  <h3 style={styles.sectionTitle}>Resolution</h3>
                  <p style={styles.resolutionText}>{selectedTicket.resolution_notes}</p>
                </div>
              )}
              
              {ticketNotes.length > 0 && (
                <div style={styles.notesSection}>
                  <h3 style={styles.sectionTitle}>Updates</h3>
                  {ticketNotes.map(note => (
                    <div key={note.id} style={styles.noteItem}>
                      <div style={styles.noteHeader}>
                        <span style={styles.noteAuthor}>{note.employee_name || 'Support Team'}</span>
                        <span style={styles.noteDate}>{new Date(note.created_at).toLocaleString()}</span>
                      </div>
                      <p style={styles.noteText}>{note.note_text}</p>
                    </div>
                  ))}
                </div>
              )}
              
              <div style={styles.modalSection}>
                <h3 style={styles.sectionTitle}>Timeline</h3>
                {selectedTicket.created_at ? (
                  <>
                    <p style={styles.sectionText}>
                      <strong>Created:</strong> {formatDate(selectedTicket.created_at)}
                    </p>
                    {selectedTicket.updated_at && (
                      <p style={styles.sectionText}>
                        <strong>Last Updated:</strong> {formatDate(selectedTicket.updated_at)}
                      </p>
                    )}
                  </>
                ) : (
                  <p style={styles.sectionText}>
                    Timeline information not available
                  </p>
                )}
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
    color: '#5b21b6',
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
    margin: '48px auto',
    padding: '0 48px',
  },
  filterBar: {
    display: 'flex',
    gap: '12px',
    marginBottom: '28px',
    flexWrap: 'wrap' as const,
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '20px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
    border: '2px solid rgba(102, 126, 234, 0.1)',
  },
  searchInput: {
    flex: '2',
    minWidth: '200px',
    padding: '14px 18px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    fontSize: '15px',
    backgroundColor: '#f9fafb',
    transition: 'all 0.2s',
  },
  select: {
    padding: '14px 18px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    fontSize: '15px',
    backgroundColor: '#f9fafb',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  clearButton: {
    padding: '14px 24px',
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '700' as const,
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },
  statCard: {
    padding: '28px',
    background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
    borderRadius: '20px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
    textAlign: 'center' as const,
    border: '2px solid rgba(102, 126, 234, 0.1)',
    transition: 'all 0.3s',
  },
  statValue: {
    fontSize: '42px',
    fontWeight: '800' as const,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  statLabel: {
    fontSize: '15px',
    color: '#6b7280',
    marginTop: '8px',
    fontWeight: '600',
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
    borderTop: '4px solid #667eea',
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
  retryButton: {
    padding: '8px 16px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '80px 20px',
  },
  createButton: {
    padding: '16px 32px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '17px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 6px 20px rgba(102, 126, 234, 0.5)',
    transition: 'all 0.3s',
  },
  ticketGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
    gap: '24px',
    marginBottom: '100px',
  },
  ticketCard: {
    background: 'white',
    padding: '24px',
    borderRadius: '20px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
    cursor: 'pointer',
    transition: 'all 0.3s',
    border: '2px solid transparent',
  },
  ticketHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
  },
  ticketId: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#667eea',
  },
  badges: {
    display: 'flex',
    gap: '8px',
  },
  badge: {
    padding: '6px 14px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: '700',
    color: 'white',
    textTransform: 'uppercase' as const,
  },
  badgeOutline: {
    padding: '6px 14px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#374151',
    border: '2px solid #d1d5db',
    textTransform: 'capitalize' as const,
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
    marginBottom: '18px',
  },
  ticketFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '12px',
    borderTop: '1px solid #f3f4f6',
  },
  ticketMeta: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  ticketType: {
    fontSize: '13px',
    color: '#667eea',
    fontWeight: '600',
    textTransform: 'capitalize' as const,
  },
  ticketDepartment: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500',
  },
  ticketDate: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  floatingButton: {
    position: 'fixed' as const,
    bottom: '48px',
    right: '48px',
    padding: '18px 36px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '60px',
    fontSize: '17px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 8px 30px rgba(102, 126, 234, 0.6)',
    transition: 'all 0.3s',
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
    borderRadius: '24px',
    width: '90%',
    maxWidth: '650px',
    maxHeight: '80vh',
    overflow: 'auto',
    boxShadow: '0 25px 80px rgba(0,0,0,0.25)',
    border: '2px solid rgba(102, 126, 234, 0.1)',
  },
  modalHeader: {
    padding: '28px',
    borderBottom: '2px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: '26px',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
  },
  closeButton: {
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
  modalBadges: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    flexWrap: 'wrap' as const,
  },
  modalSection: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    marginBottom: '8px',
  },
  sectionText: {
    fontSize: '16px',
    color: '#374151',
    lineHeight: '1.6',
    margin: '4px 0',
    wordWrap: 'break-word' as const,
    overflowWrap: 'break-word' as const,
    whiteSpace: 'pre-wrap' as const,
  },
  resolutionSection: {
    backgroundColor: '#f3f4f6',
    padding: '15px',
    borderRadius: '5px',
    marginBottom: '20px',
  },
  resolutionText: {
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: '1.6',
    wordWrap: 'break-word' as const,
    overflowWrap: 'break-word' as const,
    whiteSpace: 'pre-wrap' as const,
  },
  notesSection: {
    marginTop: '20px',
    marginBottom: '20px',
  },
  noteItem: {
    backgroundColor: '#f9fafb',
    padding: '15px',
    borderRadius: '5px',
    marginBottom: '10px',
    borderLeft: '3px solid #667eea',
  },
  noteHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    fontSize: '12px',
  },
  noteAuthor: {
    fontWeight: 'bold' as const,
    color: '#1f2937',
  },
  noteDate: {
    color: '#6b7280',
  },
  noteText: {
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: '1.5',
    wordWrap: 'break-word' as const,
    overflowWrap: 'break-word' as const,
    whiteSpace: 'pre-wrap' as const,
  },
};

export default UserTickets;
