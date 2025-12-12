import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Ticket, TicketNote } from '../types';

const TicketList: React.FC = () => {
    const { token, employee, hasPermission } = useAuth();
    const navigate = useNavigate();
    const mlDebounceTimer = useRef<NodeJS.Timeout | null>(null);
    
    // Check if user has permission to view tickets
    useEffect(() => {
        if (!hasPermission('view_tickets') && !hasPermission('view_all_tickets')) {
            alert('You do not have permission to view tickets');
            navigate('/employee/dashboard');
        }
    }, [hasPermission, navigate]);
    
    // State management
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    
    // Filter states
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');
    const [departmentFilter, setDepartmentFilter] = useState<string>('all');
    
    // Pagination
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [itemsPerPage, setItemsPerPage] = useState<number>(20);
    
    // Modal states
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
    const [showEditModal, setShowEditModal] = useState<boolean>(false);
    const [showCloseModal, setShowCloseModal] = useState<boolean>(false);
    const [showNoteModal, setShowNoteModal] = useState<boolean>(false);
    const [showCreateTicketModal, setShowCreateTicketModal] = useState<boolean>(false);
    
    // Form states
    const [editForm, setEditForm] = useState<any>({});
    const [closeForm, setCloseForm] = useState({ resolution_notes: '' });
    const [noteForm, setNoteForm] = useState({ note_text: '', is_internal: false });
    const [createForm, setCreateForm] = useState({
        title: '',
        description: '',
        type: 'request',
        priority: 'medium',
        department_id: '',
        assigned_to: ''
    });
    
    // ML suggestion states
    const [showMLSuggestions, setShowMLSuggestions] = useState<boolean>(false);
    const [mlPredictions, setMlPredictions] = useState<any>(null);
    const [mlLoading, setMlLoading] = useState<boolean>(false);
    const [mlError, setMlError] = useState<string | null>(null);
    
    // Notes for selected ticket
    const [ticketNotes, setTicketNotes] = useState<TicketNote[]>([]);
    
    // Load data
    useEffect(() => {
        fetchTickets();
        if (hasPermission('assign_tickets')) {
            fetchEmployees();
        }
        fetchDepartments();
    }, []);
    
    const fetchTickets = async () => {
        try {
            const response = await api.get('/tickets', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setTickets(response.data);
        } catch (err) {
            setError('Failed to fetch tickets');
        } finally {
            setLoading(false);
        }
    };
    
    const fetchEmployees = async () => {
        try {
            const response = await api.get('/employees', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setEmployees(response.data);
        } catch (err) {
            console.error('Failed to fetch employees:', err);
        }
    };
    
    const fetchDepartments = async () => {
        try {
            const response = await api.get('/departments', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setDepartments(response.data);
        } catch (err) {
            console.error('Failed to fetch departments:', err);
        }
    };
    
    const fetchTicketNotes = async (ticketId: number) => {
        try {
            const response = await api.get(`/tickets/${ticketId}/notes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setTicketNotes(response.data);
        } catch (err) {
            console.error('Failed to fetch notes:', err);
        }
    };
    
    // Handle ticket detail view
    const handleViewTicket = async (ticket: Ticket) => {
        setSelectedTicket(ticket);
        await fetchTicketNotes(ticket.id);
        setShowDetailModal(true);
    };
    
    // Handle edit ticket
    const handleEditTicket = (ticket: Ticket) => {
        setSelectedTicket(ticket);
        setEditForm({
            status: ticket.status,
            priority: ticket.priority,
            assigned_to: ticket.assigned_to || '',
            department_id: ticket.department_id || ''
        });
        setShowEditModal(true);
    };
    
    const submitEdit = async () => {
        if (!selectedTicket) return;
        
        try {
            await api.put(`/tickets/${selectedTicket.id}`, editForm, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setShowEditModal(false);
            fetchTickets();
        } catch (err: any) {
            alert('Failed to update ticket: ' + (err.response?.data?.error || err.message));
        }
    };
    
    // Handle close ticket
    const handleCloseTicket = (ticket: Ticket) => {
        setSelectedTicket(ticket);
        setCloseForm({ resolution_notes: '' });
        setShowCloseModal(true);
    };
    
    const submitClose = async () => {
        if (!selectedTicket || !employee) return;
        
        if (!closeForm.resolution_notes.trim()) {
            alert('Resolution notes are required');
            return;
        }
        
        try {
            await api.patch(`/tickets/${selectedTicket.id}/close`, {
                resolution_notes: closeForm.resolution_notes,
                employee_id: employee.id
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setShowCloseModal(false);
            fetchTickets();
        } catch (err: any) {
            alert('Failed to close ticket: ' + (err.response?.data?.error || err.message));
        }
    };
    
    // Handle add note
    const handleAddNote = (ticket: Ticket) => {
        setSelectedTicket(ticket);
        setNoteForm({ note_text: '', is_internal: false });
        setShowNoteModal(true);
    };
    
    const submitNote = async () => {
        if (!selectedTicket) return;
        
        if (!noteForm.note_text.trim()) {
            alert('Note text is required');
            return;
        }
        
        try {
            await api.post(`/tickets/${selectedTicket.id}/notes`, noteForm, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setShowNoteModal(false);
            alert('Note added successfully');
        } catch (err: any) {
            alert('Failed to add note: ' + (err.response?.data?.error || err.message));
        }
    };
    
    // Handle create employee ticket
    const handleCreateTicket = () => {
        setCreateForm({
            title: '',
            description: '',
            type: 'request',
            priority: 'medium',
            department_id: '',
            assigned_to: ''
        });
        setShowCreateTicketModal(true);
    };
    
    const submitCreateTicket = async () => {
        if (!createForm.title.trim() || !createForm.description.trim()) {
            alert('Title and description are required');
            return;
        }
        
        try {
            console.log('Submitting ticket:', createForm);
            await api.post('/tickets/employee/create', createForm, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setShowCreateTicketModal(false);
            fetchTickets();
            alert('Ticket created successfully');
        } catch (err: any) {
            console.error('Create ticket error:', err.response?.data);
            alert('Failed to create ticket: ' + (err.response?.data?.error || err.message));
        }
    };
    
    // ML Predictions with debounce
    const fetchMLPredictions = async () => {
        const { title, description } = createForm;
        
        if (!title.trim() && !description.trim()) {
            setMlPredictions(null);
            return;
        }
        
        if (title.trim().length < 5 && description.trim().length < 10) {
            return;
        }
        
        setMlLoading(true);
        setMlError(null);
        
        try {
            const response = await api.post('/ml/predict-full', {
                title: title,
                description: description
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            console.log('Employee ML predictions received:', response.data);
            console.log('Category structure:', response.data.category);
            console.log('Type:', response.data.category.type);
            console.log('Priority:', response.data.category.priority);
            setMlPredictions(response.data);
        } catch (err: any) {
            console.error('ML prediction error:', err);
            setMlError(err.response?.data?.error || 'Failed to get ML predictions');
        } finally {
            setMlLoading(false);
        }
    };
    
    const debouncedMLPredictions = () => {
        if (mlDebounceTimer.current) {
            clearTimeout(mlDebounceTimer.current);
        }
        mlDebounceTimer.current = setTimeout(() => {
            if (showMLSuggestions) {
                fetchMLPredictions();
            }
        }, 800);
    };
    
    const applyMLSuggestion = (field: string, value: string) => {
        console.log(`Applying ML suggestion: ${field} = ${value}`);
        setCreateForm({ ...createForm, [field]: value });
    };
    
    // Filter tickets
    const filteredTickets = tickets.filter(ticket => {
        const matchesSearch = searchQuery === '' || 
            ticket.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ticket.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ticket.creator_name?.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
        const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
        const matchesDepartment = departmentFilter === 'all' || ticket.department_id?.toString() === departmentFilter;
        
        return matchesSearch && matchesStatus && matchesPriority && matchesDepartment;
    });
    
    // Pagination
    const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
    const paginatedTickets = filteredTickets.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );
    
    // Priority badge color
    const getPriorityColor = (priority?: string) => {
        switch (priority) {
            case 'high': return '#ef4444';
            case 'medium': return '#f59e0b';
            case 'low': return '#10b981';
            default: return '#6b7280';
        }
    };
    
    // Status badge color
    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'open': return '#3b82f6';
            case 'in_progress': return '#f59e0b';
            case 'pending': return '#8b5cf6';
            case 'closed': return '#6b7280';
            default: return '#6b7280';
        }
    };
    
    if (loading) {
        return <div style={styles.loading}>Loading tickets...</div>;
    }
    
    if (error) {
        return <div style={styles.error}>{error}</div>;
    }
    
    return (
        <div style={styles.container}>
            {/* Header with back button */}
            <div style={styles.header}>
                <button onClick={() => navigate('/employee/dashboard')} style={styles.backButton}>
                    ← Back to Dashboard
                </button>
                <h1 style={styles.title}>All Tickets</h1>
                {hasPermission('create_tickets') && (
                    <button onClick={handleCreateTicket} style={styles.createButton}>
                        + Create Ticket
                    </button>
                )}
            </div>
            
            {/* Filters */}
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
                
                <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} style={styles.select}>
                    <option value="all">All Departments</option>
                    {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                </select>
                
                <button onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setPriorityFilter('all');
                    setDepartmentFilter('all');
                }} style={styles.clearButton}>
                    Clear Filters
                </button>
            </div>
            
            {/* Stats */}
            <div style={styles.stats}>
                <div style={styles.statCard}>
                    <div style={styles.statValue}>{filteredTickets.length}</div>
                    <div style={styles.statLabel}>Total Tickets</div>
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
                    <div style={styles.statLabel}>Closed</div>
                </div>
            </div>
            
            {/* Tickets grid */}
            <div style={styles.ticketsGrid}>
                {paginatedTickets.map(ticket => (
                    <div key={ticket.id} style={styles.ticketCard}>
                        <div style={styles.ticketHeader}>
                            <span style={styles.ticketId}>#{ticket.id}</span>
                            <div style={styles.badges}>
                                <span style={{...styles.badge, backgroundColor: getPriorityColor(ticket.priority)}}>
                                    {ticket.priority}
                                </span>
                                <span style={{...styles.badge, backgroundColor: getStatusColor(ticket.status)}}>
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
                        
                        <div style={styles.ticketMeta}>
                            {ticket.department_name && (
                                <div style={styles.metaItem}>
                                    <span style={styles.metaIcon}>📁</span>
                                    <span>{ticket.department_name}</span>
                                </div>
                            )}
                            {ticket.creator_name && (
                                <div style={styles.metaItem}>
                                    <span style={styles.metaIcon}>👤</span>
                                    <span>Created by: {ticket.creator_name}</span>
                                </div>
                            )}
                            {ticket.assignee_name && (
                                <div style={styles.metaItem}>
                                    <span style={styles.metaIcon}>👨‍💼</span>
                                    <span>Assigned to: {ticket.assignee_name}</span>
                                </div>
                            )}
                        </div>
                        
                        <div style={styles.ticketActions}>
                            <button onClick={() => handleViewTicket(ticket)} style={styles.actionButton}>
                                View Details
                            </button>
                            {hasPermission('edit_tickets') && ticket.status !== 'closed' && (
                                <button onClick={() => handleEditTicket(ticket)} style={{...styles.actionButton, backgroundColor: '#3b82f6'}}>
                                    Edit
                                </button>
                            )}
                            {hasPermission('edit_tickets') && (
                                <button onClick={() => handleAddNote(ticket)} style={{...styles.actionButton, backgroundColor: '#8b5cf6'}}>
                                    Add Note
                                </button>
                            )}
                            {hasPermission('close_tickets') && ticket.status !== 'closed' && (
                                <button onClick={() => handleCloseTicket(ticket)} style={{...styles.actionButton, backgroundColor: '#ef4444'}}>
                                    Close
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            
            {filteredTickets.length === 0 && (
                <div style={styles.emptyState}>No tickets found</div>
            )}
            
            {/* Pagination */}
            {totalPages > 1 && (
                <div style={styles.pagination}>
                    <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        style={styles.pageButton}
                    >
                        Previous
                    </button>
                    <span style={styles.pageInfo}>
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        style={styles.pageButton}
                    >
                        Next
                    </button>
                    <select value={itemsPerPage} onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                    }} style={styles.select}>
                        <option value={10}>10 per page</option>
                        <option value={20}>20 per page</option>
                        <option value={50}>50 per page</option>
                        <option value={100}>100 per page</option>
                    </select>
                </div>
            )}
            
            {/* Detail Modal */}
            {showDetailModal && selectedTicket && (
                <div style={styles.modalOverlay} onClick={() => setShowDetailModal(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2>Ticket #{selectedTicket.id}</h2>
                            <button onClick={() => setShowDetailModal(false)} style={styles.closeButton}>×</button>
                        </div>
                        
                        <div style={styles.modalBody}>
                            <h3 style={styles.detailTitle}>{selectedTicket.title}</h3>
                            
                            <div style={styles.detailSection}>
                                <strong>Description:</strong>
                                <p style={styles.detailText}>{selectedTicket.description}</p>
                            </div>
                            
                            <div style={styles.detailGrid}>
                                <div><strong>Status:</strong> {selectedTicket.status}</div>
                                <div><strong>Priority:</strong> {selectedTicket.priority}</div>
                                <div><strong>Department:</strong> {selectedTicket.department_name || 'N/A'}</div>
                                <div><strong>Created by:</strong> {selectedTicket.creator_name || 'Unknown'}</div>
                                <div><strong>Assigned to:</strong> {selectedTicket.assignee_name || 'Unassigned'}</div>
                            </div>
                            
                            {selectedTicket.resolution_notes && (
                                <div style={styles.resolutionSection}>
                                    <h4 style={styles.sectionTitle}>Resolution Notes</h4>
                                    <p style={styles.resolutionText}>{selectedTicket.resolution_notes}</p>
                                </div>
                            )}
                            
                            {ticketNotes.length > 0 && (
                                <div style={styles.notesSection}>
                                    <h4 style={styles.sectionTitle}>Notes</h4>
                                    {ticketNotes.map(note => (
                                        <div key={note.id} style={styles.noteItem}>
                                            <div style={styles.noteHeader}>
                                                <span style={styles.noteAuthor}>{note.employee_name}</span>
                                                <span style={styles.noteDate}>{new Date(note.created_at).toLocaleString()}</span>
                                                {note.is_internal && (
                                                    <span style={styles.internalBadge}>Internal</span>
                                                )}
                                            </div>
                                            <p style={styles.noteText}>{note.note_text}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Edit Modal */}
            {showEditModal && selectedTicket && (
                <div style={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2>Edit Ticket #{selectedTicket.id}</h2>
                            <button onClick={() => setShowEditModal(false)} style={styles.closeButton}>×</button>
                        </div>
                        
                        <div style={styles.modalBody}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Status</label>
                                <select
                                    value={editForm.status}
                                    onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                                    style={styles.input}
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
                                    style={styles.input}
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                            
                            {hasPermission('assign_tickets') && (
                                <>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Assign to Employee</label>
                                        <select
                                            value={editForm.assigned_to}
                                            onChange={(e) => setEditForm({...editForm, assigned_to: e.target.value})}
                                            style={styles.input}
                                        >
                                            <option value="">Unassigned</option>
                                            {employees.map(emp => (
                                                <option key={emp.id} value={emp.id}>
                                                    {emp.first_name} {emp.last_name} ({emp.department_name})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Department</label>
                                        <select
                                            value={editForm.department_id}
                                            onChange={(e) => setEditForm({...editForm, department_id: e.target.value})}
                                            style={styles.input}
                                        >
                                            <option value="">No department</option>
                                            {departments.map(dept => (
                                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}
                            
                            <div style={styles.modalActions}>
                                <button onClick={submitEdit} style={styles.submitButton}>Save Changes</button>
                                <button onClick={() => setShowEditModal(false)} style={styles.cancelButton}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Close Modal */}
            {showCloseModal && selectedTicket && (
                <div style={styles.modalOverlay} onClick={() => setShowCloseModal(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2>Close Ticket #{selectedTicket.id}</h2>
                            <button onClick={() => setShowCloseModal(false)} style={styles.closeButton}>×</button>
                        </div>
                        
                        <div style={styles.modalBody}>
                            <p style={styles.warningText}>
                                Please provide resolution notes before closing this ticket.
                            </p>
                            
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Resolution Notes *</label>
                                <textarea
                                    value={closeForm.resolution_notes}
                                    onChange={(e) => setCloseForm({...closeForm, resolution_notes: e.target.value})}
                                    style={styles.textarea}
                                    rows={5}
                                    placeholder="Describe how this ticket was resolved..."
                                />
                            </div>
                            
                            <div style={styles.modalActions}>
                                <button onClick={submitClose} style={{...styles.submitButton, backgroundColor: '#ef4444'}}>
                                    Close Ticket
                                </button>
                                <button onClick={() => setShowCloseModal(false)} style={styles.cancelButton}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Note Modal */}
            {showNoteModal && selectedTicket && (
                <div style={styles.modalOverlay} onClick={() => setShowNoteModal(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2>Add Note to Ticket #{selectedTicket.id}</h2>
                            <button onClick={() => setShowNoteModal(false)} style={styles.closeButton}>×</button>
                        </div>
                        
                        <div style={styles.modalBody}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Note *</label>
                                <textarea
                                    value={noteForm.note_text}
                                    onChange={(e) => setNoteForm({...noteForm, note_text: e.target.value})}
                                    style={styles.textarea}
                                    rows={5}
                                    placeholder="Enter your note..."
                                />
                            </div>
                            
                            <div style={styles.checkboxGroup}>
                                <input
                                    type="checkbox"
                                    id="internal"
                                    checked={noteForm.is_internal}
                                    onChange={(e) => setNoteForm({...noteForm, is_internal: e.target.checked})}
                                />
                                <label htmlFor="internal" style={styles.checkboxLabel}>
                                    Internal Note (not visible to customer)
                                </label>
                            </div>
                            
                            <div style={styles.modalActions}>
                                <button onClick={submitNote} style={styles.submitButton}>Add Note</button>
                                <button onClick={() => setShowNoteModal(false)} style={styles.cancelButton}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Create Ticket Modal */}
            {showCreateTicketModal && (
                <div style={styles.modalOverlay} onClick={() => setShowCreateTicketModal(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2>Create New Ticket</h2>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <button 
                                    onClick={() => {
                                        setShowMLSuggestions(!showMLSuggestions);
                                        if (!showMLSuggestions && createForm.title && createForm.description) {
                                            fetchMLPredictions();
                                        }
                                    }}
                                    style={{
                                        ...styles.mlToggleButton,
                                        backgroundColor: showMLSuggestions ? '#10b981' : '#6b7280'
                                    }}
                                >
                                    🤖 {showMLSuggestions ? 'ML ON' : 'ML OFF'}
                                </button>
                                <button onClick={() => setShowCreateTicketModal(false)} style={styles.closeButton}>×</button>
                            </div>
                        </div>
                        
                        <div style={styles.modalBody}>
                            <div style={styles.formGroup}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label style={styles.label}>Title *</label>
                                    <span style={{
                                        fontSize: '12px',
                                        color: createForm.title.length < 5 ? '#ef4444' : '#10b981'
                                    }}>
                                        {createForm.title.length}/500 (min: 5)
                                    </span>
                                </div>
                                <input
                                    type="text"
                                    value={createForm.title}
                                    onChange={(e) => {
                                        setCreateForm({...createForm, title: e.target.value});
                                        debouncedMLPredictions();
                                    }}
                                    style={{
                                        ...styles.input,
                                        borderColor: createForm.title.length > 0 && createForm.title.length < 5 ? '#ef4444' : '#d1d5db'
                                    }}
                                    placeholder="Brief description of the issue (minimum 5 characters)"
                                />
                                {createForm.title.length > 0 && createForm.title.length < 5 && (
                                    <div style={styles.validationError}>
                                        ⚠️ Title must be at least 5 characters
                                    </div>
                                )}
                            </div>
                            
                            <div style={styles.formGroup}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label style={styles.label}>Description *</label>
                                    <span style={{
                                        fontSize: '12px',
                                        color: createForm.description.length < 10 ? '#ef4444' : '#10b981'
                                    }}>
                                        {createForm.description.length}/5000 (min: 10)
                                    </span>
                                </div>
                                <textarea
                                    value={createForm.description}
                                    onChange={(e) => {
                                        setCreateForm({...createForm, description: e.target.value});
                                        debouncedMLPredictions();
                                    }}
                                    style={{
                                        ...styles.textarea,
                                        borderColor: createForm.description.length > 0 && createForm.description.length < 10 ? '#ef4444' : '#d1d5db'
                                    }}
                                    rows={5}
                                    placeholder="Detailed description (minimum 10 characters)..."
                                />
                                {createForm.description.length > 0 && createForm.description.length < 10 && (
                                    <div style={styles.validationError}>
                                        ⚠️ Description must be at least 10 characters
                                    </div>
                                )}
                            </div>
                            
                            {/* ML Suggestions */}
                            {showMLSuggestions && (
                                <div style={styles.mlSuggestionsBox}>
                                    <h3 style={styles.mlSuggestionsTitle}>
                                        🤖 AI Suggestions
                                        {mlLoading && <span style={styles.mlLoadingText}> (Analyzing...)</span>}
                                    </h3>
                                    
                                    {mlError && (
                                        <div style={styles.mlError}>⚠️ {mlError}</div>
                                    )}
                                    
                                    {mlPredictions && !mlLoading && (
                                        <div style={styles.mlSuggestionsGrid}>
                                            {/* Type Suggestion */}
                                            <div style={styles.mlSuggestionCard}>
                                                <div style={styles.mlSuggestionHeader}>
                                                    <span style={styles.mlSuggestionLabel}>Suggested Type</span>
                                                    <span style={styles.mlConfidence}>
                                                        {typeof mlPredictions.category.type === 'object' 
                                                            ? (mlPredictions.category.type.confidence * 100).toFixed(1)
                                                            : (mlPredictions.category.confidence * 100).toFixed(1)
                                                        }% confident
                                                    </span>
                                                </div>
                                                <div style={styles.mlSuggestionValue}>
                                                    {typeof mlPredictions.category.type === 'object' 
                                                        ? mlPredictions.category.type.prediction 
                                                        : mlPredictions.category.type
                                                    }
                                                </div>
                                                <button
                                                    onClick={() => applyMLSuggestion('type', 
                                                        typeof mlPredictions.category.type === 'object' 
                                                            ? mlPredictions.category.type.prediction 
                                                            : mlPredictions.category.type
                                                    )}
                                                    style={styles.mlApplyButton}
                                                >
                                                    Apply
                                                </button>
                                            </div>
                                            
                                            {/* Priority Suggestion */}
                                            <div style={styles.mlSuggestionCard}>
                                                <div style={styles.mlSuggestionHeader}>
                                                    <span style={styles.mlSuggestionLabel}>Suggested Priority</span>
                                                    <span style={styles.mlConfidence}>
                                                        {typeof mlPredictions.category.priority === 'object'
                                                            ? (mlPredictions.category.priority.confidence * 100).toFixed(1)
                                                            : 'N/A'
                                                        }% confident
                                                    </span>
                                                </div>
                                                <div style={styles.mlSuggestionValue}>
                                                    {typeof mlPredictions.category.priority === 'object'
                                                        ? mlPredictions.category.priority.prediction
                                                        : mlPredictions.category.priority
                                                    }
                                                </div>
                                                <button
                                                    onClick={() => applyMLSuggestion('priority', 
                                                        typeof mlPredictions.category.priority === 'object'
                                                            ? mlPredictions.category.priority.prediction
                                                            : mlPredictions.category.priority
                                                    )}
                                                    style={styles.mlApplyButton}
                                                >
                                                    Apply
                                                </button>
                                            </div>
                                            
                                            {/* Sentiment Analysis */}
                                            {mlPredictions.sentiment && (
                                                <div style={styles.mlSuggestionCard}>
                                                    <div style={styles.mlSuggestionHeader}>
                                                        <span style={styles.mlSuggestionLabel}>Sentiment Analysis</span>
                                                        <span style={styles.mlConfidence}>
                                                            {(mlPredictions.sentiment.score * 100).toFixed(1)}% confident
                                                        </span>
                                                    </div>
                                                    <div style={styles.mlSentimentDisplay}>
                                                        <span style={styles.mlSentimentEmoji}>
                                                            {mlPredictions.sentiment.emotion === 'angry' && '😡'}
                                                            {mlPredictions.sentiment.emotion === 'frustrated' && '😤'}
                                                            {mlPredictions.sentiment.emotion === 'concerned' && '😟'}
                                                            {mlPredictions.sentiment.emotion === 'neutral' && '😐'}
                                                            {mlPredictions.sentiment.emotion === 'satisfied' && '😊'}
                                                        </span>
                                                        <span style={styles.mlSentimentText}>
                                                            {mlPredictions.sentiment.emotion}
                                                        </span>
                                                    </div>
                                                    {mlPredictions.sentiment.urgency_flag && (
                                                        <div style={styles.mlUrgencyFlag}>
                                                            ⚠️ High urgency detected
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Type</label>
                                    <select
                                        value={createForm.type}
                                        onChange={(e) => setCreateForm({...createForm, type: e.target.value})}
                                        style={styles.input}
                                    >
                                        <option value="request">Request</option>
                                        <option value="incident">Incident</option>
                                        <option value="problem">Problem</option>
                                        <option value="question">Question</option>
                                    </select>
                                </div>
                                
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Priority</label>
                                    <select
                                        value={createForm.priority}
                                        onChange={(e) => setCreateForm({...createForm, priority: e.target.value})}
                                        style={styles.input}
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Department</label>
                                    <select
                                        value={createForm.department_id}
                                        onChange={(e) => setCreateForm({...createForm, department_id: e.target.value})}
                                        style={styles.input}
                                    >
                                        <option value="">Select department</option>
                                        {departments.map(dept => (
                                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                {hasPermission('assign_tickets') && (
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Assign To</label>
                                        <select
                                            value={createForm.assigned_to}
                                            onChange={(e) => setCreateForm({...createForm, assigned_to: e.target.value})}
                                            style={styles.input}
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
                            </div>
                            
                            <div style={styles.modalActions}>
                                <button 
                                    onClick={submitCreateTicket} 
                                    style={{
                                        ...styles.submitButton,
                                        opacity: createForm.title.length < 5 || createForm.description.length < 10 ? 0.5 : 1,
                                        cursor: createForm.title.length < 5 || createForm.description.length < 10 ? 'not-allowed' : 'pointer'
                                    }}
                                    disabled={createForm.title.length < 5 || createForm.description.length < 10}
                                >
                                    Create Ticket
                                </button>
                                <button onClick={() => setShowCreateTicketModal(false)} style={styles.cancelButton}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Styles
const styles: { [key: string]: React.CSSProperties } = {
    container: {
        padding: '32px',
        maxWidth: '1400px',
        margin: '0 auto',
        background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
        minHeight: '100vh'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px'
    },
    backButton: {
        padding: '12px 24px',
        background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        fontSize: '15px',
        fontWeight: '700',
        transition: 'all 0.3s',
        boxShadow: '0 4px 12px rgba(107, 114, 128, 0.3)'
    },
    title: {
        fontSize: '36px',
        fontWeight: '800',
        background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        flex: 1,
        textAlign: 'center'
    },
    createButton: {
        padding: '12px 24px',
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        fontSize: '15px',
        fontWeight: '700',
        transition: 'all 0.3s',
        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
    },
    filterBar: {
        display: 'flex',
        gap: '12px',
        marginBottom: '28px',
        flexWrap: 'wrap'
    },
    searchInput: {
        flex: '2',
        padding: '14px 18px',
        border: '2px solid #e5e7eb',
        borderRadius: '12px',
        fontSize: '15px',
        backgroundColor: 'white',
        transition: 'all 0.2s'
    },
    select: {
        padding: '14px 18px',
        border: '2px solid #e5e7eb',
        borderRadius: '12px',
        fontSize: '15px',
        backgroundColor: 'white',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    clearButton: {
        padding: '14px 24px',
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        fontSize: '15px',
        fontWeight: '700',
        transition: 'all 0.3s',
        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
    },
    stats: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
    },
    statCard: {
        padding: '28px',
        background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
        borderRadius: '20px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
        textAlign: 'center',
        border: '2px solid rgba(14, 165, 233, 0.1)',
        transition: 'all 0.3s'
    },
    statValue: {
        fontSize: '42px',
        fontWeight: '800',
        background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
    },
    statLabel: {
        fontSize: '15px',
        color: '#6b7280',
        marginTop: '8px',
        fontWeight: '600'
    },
    ticketsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
    },
    ticketCard: {
        padding: '24px',
        background: 'white',
        borderRadius: '20px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
        transition: 'all 0.3s',
        border: '2px solid transparent'
    },
    ticketHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '14px'
    },
    ticketId: {
        fontSize: '15px',
        fontWeight: '700',
        color: '#0ea5e9'
    },
    badges: {
        display: 'flex',
        gap: '8px'
    },
    badge: {
        padding: '6px 12px',
        borderRadius: '16px',
        fontSize: '12px',
        fontWeight: '700',
        color: 'white',
        textTransform: 'uppercase'
    },
    ticketTitle: {
        fontSize: '19px',
        fontWeight: '800',
        color: '#1f2937',
        marginBottom: '12px',
        lineHeight: '1.4'
    },
    ticketDescription: {
        fontSize: '15px',
        color: '#4b5563',
        marginBottom: '18px',
        lineHeight: '1.6',
        wordWrap: 'break-word',
        overflowWrap: 'break-word'
    },
    ticketMeta: {
        fontSize: '12px',
        color: '#6b7280',
        marginBottom: '15px'
    },
    metaItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        marginBottom: '5px'
    },
    metaIcon: {
        fontSize: '14px'
    },
    ticketActions: {
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap'
    },
    actionButton: {
        padding: '10px 16px',
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '700',
        flex: 1,
        minWidth: '90px',
        transition: 'all 0.3s',
        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
    },
    pagination: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '15px',
        padding: '20px'
    },
    pageButton: {
        padding: '10px 20px',
        backgroundColor: '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '14px'
    },
    pageInfo: {
        fontSize: '14px',
        color: '#4b5563'
    },
    loading: {
        textAlign: 'center',
        padding: '40px',
        fontSize: '18px',
        color: '#6b7280'
    },
    error: {
        textAlign: 'center',
        padding: '40px',
        fontSize: '18px',
        color: '#ef4444'
    },
    emptyState: {
        textAlign: 'center',
        padding: '60px',
        fontSize: '18px',
        color: '#9ca3af',
        backgroundColor: 'white',
        borderRadius: '8px'
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
    },
    modalContent: {
        background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
        borderRadius: '24px',
        maxWidth: '650px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 25px 80px rgba(0,0,0,0.25)',
        overflowWrap: 'break-word',
        border: '2px solid rgba(14, 165, 233, 0.1)'
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '28px',
        borderBottom: '2px solid #e5e7eb'
    },
    closeButton: {
        background: 'none',
        border: 'none',
        fontSize: '28px',
        cursor: 'pointer',
        color: '#6b7280'
    },
    modalBody: {
        padding: '20px'
    },
    detailTitle: {
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: '15px'
    },
    detailSection: {
        marginBottom: '20px'
    },
    detailText: {
        fontSize: '14px',
        color: '#4b5563',
        lineHeight: '1.6',
        marginTop: '10px',
        wordWrap: 'break-word',
        overflowWrap: 'break-word',
        whiteSpace: 'pre-wrap'
    },
    detailGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '15px',
        marginBottom: '20px',
        fontSize: '14px',
        color: '#4b5563'
    },
    resolutionSection: {
        backgroundColor: '#f3f4f6',
        padding: '15px',
        borderRadius: '5px',
        marginBottom: '20px'
    },
    sectionTitle: {
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: '10px'
    },
    resolutionText: {
        fontSize: '14px',
        color: '#4b5563',
        lineHeight: '1.6',
        wordWrap: 'break-word',
        overflowWrap: 'break-word',
        whiteSpace: 'pre-wrap'
    },
    notesSection: {
        marginTop: '20px'
    },
    noteItem: {
        backgroundColor: '#f9fafb',
        padding: '15px',
        borderRadius: '5px',
        marginBottom: '10px',
        borderLeft: '3px solid #3b82f6'
    },
    noteHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px',
        fontSize: '12px'
    },
    noteAuthor: {
        fontWeight: 'bold',
        color: '#1f2937'
    },
    noteDate: {
        color: '#6b7280'
    },
    internalBadge: {
        backgroundColor: '#ef4444',
        color: 'white',
        padding: '2px 6px',
        borderRadius: '10px',
        fontSize: '10px',
        fontWeight: 'bold'
    },
    noteText: {
        fontSize: '14px',
        color: '#4b5563',
        lineHeight: '1.5',
        wordWrap: 'break-word',
        overflowWrap: 'break-word',
        whiteSpace: 'pre-wrap'
    },
    formGroup: {
        marginBottom: '20px'
    },
    formRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '15px'
    },
    label: {
        display: 'block',
        marginBottom: '5px',
        fontSize: '14px',
        fontWeight: 'bold',
        color: '#374151'
    },
    input: {
        width: '100%',
        padding: '14px 18px',
        border: '2px solid #e5e7eb',
        borderRadius: '12px',
        fontSize: '15px',
        boxSizing: 'border-box',
        backgroundColor: '#f9fafb',
        transition: 'all 0.2s'
    },
    textarea: {
        width: '100%',
        padding: '14px 18px',
        border: '2px solid #e5e7eb',
        borderRadius: '12px',
        fontSize: '15px',
        fontFamily: 'inherit',
        resize: 'vertical',
        boxSizing: 'border-box',
        backgroundColor: '#f9fafb',
        transition: 'all 0.2s',
        minHeight: '100px'
    },
    checkboxGroup: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '20px'
    },
    checkboxLabel: {
        fontSize: '14px',
        color: '#374151'
    },
    warningText: {
        fontSize: '14px',
        color: '#d97706',
        marginBottom: '20px',
        padding: '10px',
        backgroundColor: '#fef3c7',
        borderRadius: '5px'
    },
    modalActions: {
        display: 'flex',
        gap: '10px',
        justifyContent: 'flex-end',
        marginTop: '20px'
    },
    submitButton: {
        padding: '14px 28px',
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        fontSize: '15px',
        fontWeight: '700',
        transition: 'all 0.3s',
        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)'
    },
    cancelButton: {
        padding: '14px 28px',
        background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        fontSize: '15px',
        fontWeight: '700',
        transition: 'all 0.3s'
    },
    mlToggleButton: {
        padding: '8px 16px',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 'bold',
        transition: 'background-color 0.2s'
    },
    mlSuggestionsBox: {
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
        border: '2px solid #38bdf8',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 20px rgba(14, 165, 233, 0.15)'
    },
    mlSuggestionsTitle: {
        fontSize: '18px',
        fontWeight: '800',
        background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '16px'
    },
    mlLoadingText: {
        fontSize: '14px',
        fontWeight: 'normal',
        color: '#6b7280'
    },
    mlError: {
        backgroundColor: '#fee2e2',
        border: '1px solid #ef4444',
        borderRadius: '5px',
        padding: '10px',
        color: '#991b1b',
        fontSize: '14px'
    },
    mlSuggestionsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px'
    },
    mlSuggestionCard: {
        backgroundColor: 'white',
        border: '2px solid #bae6fd',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
    },
    mlSuggestionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px'
    },
    mlSuggestionLabel: {
        fontSize: '13px',
        fontWeight: '700',
        color: '#64748b',
        textTransform: 'uppercase'
    },
    mlConfidence: {
        fontSize: '12px',
        padding: '4px 10px',
        background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
        color: '#065f46',
        fontWeight: '700',
        borderRadius: '8px'
    },
    mlSuggestionValue: {
        fontSize: '17px',
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: '12px',
        textTransform: 'capitalize'
    },
    mlApplyButton: {
        width: '100%',
        padding: '10px 16px',
        background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '700',
        transition: 'all 0.3s',
        boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)'
    },
    mlSentimentDisplay: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '8px'
    },
    mlSentimentEmoji: {
        fontSize: '24px'
    },
    mlSentimentText: {
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#1f2937',
        textTransform: 'capitalize'
    },
    mlUrgencyFlag: {
        backgroundColor: '#fef3c7',
        border: '1px solid #f59e0b',
        borderRadius: '4px',
        padding: '6px',
        fontSize: '12px',
        color: '#92400e',
        fontWeight: 'bold',
        textAlign: 'center'
    },
    validationError: {
        color: '#ef4444',
        fontSize: '12px',
        marginTop: '4px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
    }
};

export default TicketList;
