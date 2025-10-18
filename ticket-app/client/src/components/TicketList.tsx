import React, { useEffect, useState } from 'react';
import { fetchTickets } from '../services/api';
import { Ticket } from '../types';
import TicketItem from './TicketItem';

const TicketList: React.FC = () => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
    const [selectedPriorities, setSelectedPriorities] = useState<Set<string>>(new Set());
    const [selectedQueues, setSelectedQueues] = useState<Set<string>>(new Set());
    const [showFilters, setShowFilters] = useState<boolean>(false);
    const [sortBy, setSortBy] = useState<'id' | 'priority' | 'title'>('id');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [itemsPerPage, setItemsPerPage] = useState<number>(20);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

    useEffect(() => {
        const loadTickets = async () => {
            try {
                const data = await fetchTickets();
                setTickets(data);
            } catch (err) {
                setError('Failed to fetch tickets');
            } finally {
                setLoading(false);
            }
        };

        loadTickets();
    }, []);

    // Get unique types, priorities, and queues from tickets
    const uniqueTypes = Array.from(new Set(tickets.map(t => t.status).filter((s): s is string => Boolean(s))));
    const uniquePriorities = Array.from(new Set(tickets.map(t => t.priority).filter((p): p is string => Boolean(p))));
    const uniqueQueues = Array.from(new Set(tickets.map(t => t.queue).filter((q): q is string => Boolean(q))));

    const toggleType = (type: string) => {
        const newTypes = new Set(selectedTypes);
        if (newTypes.has(type)) {
            newTypes.delete(type);
        } else {
            newTypes.add(type);
        }
        setSelectedTypes(newTypes);
    };

    const togglePriority = (priority: string) => {
        const newPriorities = new Set(selectedPriorities);
        if (newPriorities.has(priority)) {
            newPriorities.delete(priority);
        } else {
            newPriorities.add(priority);
        }
        setSelectedPriorities(newPriorities);
    };

    const toggleQueue = (queue: string) => {
        const newQueues = new Set(selectedQueues);
        if (newQueues.has(queue)) {
            newQueues.delete(queue);
        } else {
            newQueues.add(queue);
        }
        setSelectedQueues(newQueues);
    };

    const clearFilters = () => {
        setSelectedTypes(new Set());
        setSelectedPriorities(new Set());
        setSelectedQueues(new Set());
        setSearchQuery('');
    };

    const filteredTickets = tickets.filter(ticket => {
        const matchesType = selectedTypes.size === 0 || (ticket.status && selectedTypes.has(ticket.status));
        const matchesPriority = selectedPriorities.size === 0 || (ticket.priority && selectedPriorities.has(ticket.priority));
        const matchesQueue = selectedQueues.size === 0 || (ticket.queue && selectedQueues.has(ticket.queue));
        const matchesSearch = searchQuery === '' || 
            ticket.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ticket.description?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesPriority && matchesQueue && matchesSearch;
    });

    // Sort tickets
    const sortedTickets = [...filteredTickets].sort((a, b) => {
        let comparison = 0;
        
        if (sortBy === 'id') {
            comparison = a.id - b.id;
        } else if (sortBy === 'priority') {
            const priorityOrder: { [key: string]: number } = { 'high': 3, 'medium': 2, 'low': 1 };
            const aPriority = priorityOrder[a.priority?.toLowerCase() || ''] || 0;
            const bPriority = priorityOrder[b.priority?.toLowerCase() || ''] || 0;
            comparison = bPriority - aPriority;
        } else if (sortBy === 'title') {
            comparison = (a.title || '').localeCompare(b.title || '');
        }
        
        return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Pagination
    const totalPages = Math.ceil(sortedTickets.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedTickets = sortedTickets.slice(startIndex, startIndex + itemsPerPage);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedTypes, selectedPriorities, selectedQueues]);

    const exportToCSV = () => {
        const headers = ['ID', 'Title', 'Description', 'Status', 'Priority', 'Queue', 'Language'];
        const csvContent = [
            headers.join(','),
            ...filteredTickets.map(ticket => [
                ticket.id,
                `"${(ticket.title || '').replace(/"/g, '""')}"`,
                `"${(ticket.description || '').replace(/"/g, '""')}"`,
                ticket.status || '',
                ticket.priority || '',
                ticket.queue || '',
                ticket.language || ''
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tickets_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '400px',
                fontSize: '18px',
                color: '#6b7280'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '50px',
                        height: '50px',
                        border: '4px solid #e5e7eb',
                        borderTop: '4px solid #3b82f6',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 16px'
                    }}></div>
                    Loading tickets...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '20px',
                color: '#991b1b',
                textAlign: 'center'
            }}>
                <strong>Error:</strong> {error}
            </div>
        );
    }

    return (
        <div>
            {/* Header Stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
            }}>
                <div style={{
                    backgroundColor: '#eff6ff',
                    padding: '20px',
                    borderRadius: '8px',
                    border: '1px solid #dbeafe'
                }}>
                    <div style={{ fontSize: '14px', color: '#1e40af', marginBottom: '4px' }}>Total Tickets</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e3a8a' }}>{tickets.length}</div>
                </div>
                <div style={{
                    backgroundColor: '#fef2f2',
                    padding: '20px',
                    borderRadius: '8px',
                    border: '1px solid #fecaca'
                }}>
                    <div style={{ fontSize: '14px', color: '#991b1b', marginBottom: '4px' }}>High Priority</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#7f1d1d' }}>
                        {tickets.filter(t => t.priority?.toLowerCase() === 'high').length}
                    </div>
                </div>
                <div style={{
                    backgroundColor: '#fef9c3',
                    padding: '20px',
                    borderRadius: '8px',
                    border: '1px solid #fde047'
                }}>
                    <div style={{ fontSize: '14px', color: '#854d0e', marginBottom: '4px' }}>Medium Priority</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#713f12' }}>
                        {tickets.filter(t => t.priority?.toLowerCase() === 'medium').length}
                    </div>
                </div>
                <div style={{
                    backgroundColor: '#f0fdf4',
                    padding: '20px',
                    borderRadius: '8px',
                    border: '1px solid #bbf7d0'
                }}>
                    <div style={{ fontSize: '14px', color: '#166534', marginBottom: '4px' }}>Low Priority</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#14532d' }}>
                        {tickets.filter(t => t.priority?.toLowerCase() === 'low').length}
                    </div>
                </div>
            </div>

            {/* Search and Filter Bar */}
            <div style={{
                display: 'flex',
                gap: '16px',
                marginBottom: '24px',
                flexWrap: 'wrap'
            }}>
                {/* Search Box */}
                <input
                    type="text"
                    placeholder="🔍 Search tickets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                        flex: 1,
                        minWidth: '300px',
                        padding: '12px 16px',
                        fontSize: '14px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        outline: 'none'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                />

                {/* Filter Toggle Button */}
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    style={{
                        padding: '12px 20px',
                        fontSize: '14px',
                        fontWeight: '500',
                        border: '1px solid #e5e7eb',
                        backgroundColor: showFilters ? '#eff6ff' : '#ffffff',
                        color: '#374151',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <span>🔧</span>
                    Filters
                    {(selectedTypes.size > 0 || selectedPriorities.size > 0 || selectedQueues.size > 0) && (
                        <span style={{
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            borderRadius: '10px',
                            padding: '2px 8px',
                            fontSize: '12px',
                            fontWeight: '600'
                        }}>
                            {selectedTypes.size + selectedPriorities.size + selectedQueues.size}
                        </span>
                    )}
                </button>

                {/* Clear Filters Button */}
                {(selectedTypes.size > 0 || selectedPriorities.size > 0 || selectedQueues.size > 0 || searchQuery) && (
                    <button
                        onClick={clearFilters}
                        style={{
                            padding: '12px 20px',
                            fontSize: '14px',
                            fontWeight: '500',
                            border: '1px solid #fecaca',
                            backgroundColor: '#fef2f2',
                            color: '#dc2626',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        Clear All
                    </button>
                )}
            </div>

            {/* Filter Panel */}
            {showFilters && (
                <div style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '20px',
                    marginBottom: '24px',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '24px'
                    }}>
                        {/* Type Filter */}
                        <div>
                            <h3 style={{
                                margin: '0 0 12px 0',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#374151',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                Type
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {uniqueTypes.map(type => (
                                    <label
                                        key={type}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            cursor: 'pointer',
                                            padding: '8px',
                                            borderRadius: '4px',
                                            transition: 'background-color 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedTypes.has(type)}
                                            onChange={() => toggleType(type)}
                                            style={{
                                                width: '16px',
                                                height: '16px',
                                                cursor: 'pointer'
                                            }}
                                        />
                                        <span style={{
                                            fontSize: '14px',
                                            color: '#374151',
                                            textTransform: 'capitalize'
                                        }}>
                                            {type}
                                        </span>
                                        <span style={{
                                            marginLeft: 'auto',
                                            fontSize: '12px',
                                            color: '#9ca3af',
                                            backgroundColor: '#f3f4f6',
                                            padding: '2px 8px',
                                            borderRadius: '10px'
                                        }}>
                                            {tickets.filter(t => t.status === type).length}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Priority Filter */}
                        <div>
                            <h3 style={{
                                margin: '0 0 12px 0',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#374151',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                Priority
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {uniquePriorities.map(priority => {
                                    const getPriorityColor = (p: string) => {
                                        switch(p.toLowerCase()) {
                                            case 'high': return '#ef4444';
                                            case 'medium': return '#f59e0b';
                                            case 'low': return '#10b981';
                                            default: return '#6b7280';
                                        }
                                    };

                                    return (
                                        <label
                                            key={priority}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                cursor: 'pointer',
                                                padding: '8px',
                                                borderRadius: '4px',
                                                transition: 'background-color 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedPriorities.has(priority)}
                                                onChange={() => togglePriority(priority)}
                                                style={{
                                                    width: '16px',
                                                    height: '16px',
                                                    cursor: 'pointer'
                                                }}
                                            />
                                            <span style={{
                                                fontSize: '8px',
                                                color: getPriorityColor(priority)
                                            }}>
                                                ●
                                            </span>
                                            <span style={{
                                                fontSize: '14px',
                                                color: '#374151',
                                                textTransform: 'capitalize'
                                            }}>
                                                {priority}
                                            </span>
                                            <span style={{
                                                marginLeft: 'auto',
                                                fontSize: '12px',
                                                color: '#9ca3af',
                                                backgroundColor: '#f3f4f6',
                                                padding: '2px 8px',
                                                borderRadius: '10px'
                                            }}>
                                                {tickets.filter(t => t.priority === priority).length}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Queue Filter */}
                        <div>
                            <h3 style={{
                                margin: '0 0 12px 0',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#374151',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                Queue / Department
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {uniqueQueues.map(queue => (
                                    <label
                                        key={queue}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            cursor: 'pointer',
                                            padding: '8px',
                                            borderRadius: '4px',
                                            transition: 'background-color 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedQueues.has(queue)}
                                            onChange={() => toggleQueue(queue)}
                                            style={{
                                                width: '16px',
                                                height: '16px',
                                                cursor: 'pointer'
                                            }}
                                        />
                                        <span style={{ fontSize: '14px' }}>
                                            📁
                                        </span>
                                        <span style={{
                                            fontSize: '14px',
                                            color: '#374151',
                                            textTransform: 'capitalize'
                                        }}>
                                            {queue}
                                        </span>
                                        <span style={{
                                            marginLeft: 'auto',
                                            fontSize: '12px',
                                            color: '#9ca3af',
                                            backgroundColor: '#f3f4f6',
                                            padding: '2px 8px',
                                            borderRadius: '10px'
                                        }}>
                                            {tickets.filter(t => t.queue === queue).length}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toolbar: Sort, Export, and Results Count */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '16px',
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>
                        Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedTickets.length)} of {sortedTickets.length} tickets
                    </span>
                    
                    {/* Items per page */}
                    <select
                        value={itemsPerPage}
                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        style={{
                            padding: '6px 12px',
                            fontSize: '14px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            backgroundColor: '#ffffff',
                            cursor: 'pointer',
                            outline: 'none'
                        }}
                    >
                        <option value={10}>10 per page</option>
                        <option value={20}>20 per page</option>
                        <option value={50}>50 per page</option>
                        <option value={100}>100 per page</option>
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* Sort By */}
                    <span style={{ color: '#6b7280', fontSize: '14px' }}>Sort by:</span>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'id' | 'priority' | 'title')}
                        style={{
                            padding: '6px 12px',
                            fontSize: '14px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            backgroundColor: '#ffffff',
                            cursor: 'pointer',
                            outline: 'none'
                        }}
                    >
                        <option value="id">ID</option>
                        <option value="priority">Priority</option>
                        <option value="title">Title</option>
                    </select>

                    {/* Sort Order Toggle */}
                    <button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        style={{
                            padding: '6px 12px',
                            fontSize: '14px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            backgroundColor: '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                        title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                    >
                        {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>

                    {/* Export Button */}
                    <button
                        onClick={exportToCSV}
                        style={{
                            padding: '8px 16px',
                            fontSize: '14px',
                            fontWeight: '500',
                            border: 'none',
                            borderRadius: '6px',
                            backgroundColor: '#10b981',
                            color: '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                    >
                        📊 Export CSV
                    </button>
                </div>
            </div>

            {/* Ticket List */}
            <div>
                {filteredTickets.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '60px 20px',
                        color: '#9ca3af'
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                        <div style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>No tickets found</div>
                        <div style={{ fontSize: '14px' }}>Try adjusting your search or filter</div>
                    </div>
                ) : (
                    paginatedTickets.map(ticket => (
                        <div key={ticket.id} onClick={() => setSelectedTicket(ticket)}>
                            <TicketItem ticket={ticket} />
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '32px',
                    paddingBottom: '32px'
                }}>
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        style={{
                            padding: '8px 16px',
                            fontSize: '14px',
                            fontWeight: '500',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            backgroundColor: currentPage === 1 ? '#f9fafb' : '#ffffff',
                            color: currentPage === 1 ? '#9ca3af' : '#374151',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        ← Previous
                    </button>

                    <div style={{ display: 'flex', gap: '4px' }}>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                                pageNum = i + 1;
                            } else if (currentPage <= 3) {
                                pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                            } else {
                                pageNum = currentPage - 2 + i;
                            }

                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        fontSize: '14px',
                                        fontWeight: currentPage === pageNum ? '600' : '500',
                                        border: currentPage === pageNum ? 'none' : '1px solid #e5e7eb',
                                        borderRadius: '6px',
                                        backgroundColor: currentPage === pageNum ? '#3b82f6' : '#ffffff',
                                        color: currentPage === pageNum ? '#ffffff' : '#374151',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        style={{
                            padding: '8px 16px',
                            fontSize: '14px',
                            fontWeight: '500',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            backgroundColor: currentPage === totalPages ? '#f9fafb' : '#ffffff',
                            color: currentPage === totalPages ? '#9ca3af' : '#374151',
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Next →
                    </button>
                </div>
            )}

            {/* Ticket Detail Modal */}
            {selectedTicket && (
                <div
                    onClick={() => setSelectedTicket(null)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '20px',
                        animation: 'fadeIn 0.2s'
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '12px',
                            maxWidth: '800px',
                            width: '100%',
                            maxHeight: '90vh',
                            overflow: 'auto',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                            animation: 'slideUp 0.3s'
                        }}
                    >
                        {/* Modal Header */}
                        <div style={{
                            padding: '24px',
                            borderBottom: '1px solid #e5e7eb',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'start'
                        }}>
                            <div style={{ flex: 1, marginRight: '16px' }}>
                                <h2 style={{
                                    margin: '0 0 8px 0',
                                    fontSize: '24px',
                                    fontWeight: '600',
                                    color: '#111827'
                                }}>
                                    {selectedTicket.title}
                                </h2>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {selectedTicket.priority && (
                                        <span style={{
                                            fontSize: '12px',
                                            fontWeight: '500',
                                            padding: '4px 10px',
                                            borderRadius: '12px',
                                            backgroundColor: selectedTicket.priority === 'high' ? '#fee2e2' : 
                                                           selectedTicket.priority === 'medium' ? '#fef3c7' : '#d1fae5',
                                            color: selectedTicket.priority === 'high' ? '#991b1b' : 
                                                   selectedTicket.priority === 'medium' ? '#854d0e' : '#065f46'
                                        }}>
                                            {selectedTicket.priority}
                                        </span>
                                    )}
                                    {selectedTicket.status && (
                                        <span style={{
                                            fontSize: '12px',
                                            fontWeight: '500',
                                            padding: '4px 10px',
                                            borderRadius: '12px',
                                            backgroundColor: '#dbeafe',
                                            color: '#1e40af'
                                        }}>
                                            {selectedTicket.status}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedTicket(null)}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    border: 'none',
                                    borderRadius: '6px',
                                    backgroundColor: '#f3f4f6',
                                    color: '#6b7280',
                                    fontSize: '20px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '24px' }}>
                            <div style={{ marginBottom: '24px' }}>
                                <h3 style={{
                                    margin: '0 0 12px 0',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: '#6b7280',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Description
                                </h3>
                                <p style={{
                                    margin: 0,
                                    fontSize: '15px',
                                    lineHeight: '1.7',
                                    color: '#374151',
                                    whiteSpace: 'pre-wrap'
                                }}>
                                    {selectedTicket.description || 'No description available'}
                                </p>
                            </div>

                            {/* Metadata Grid */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: '16px',
                                padding: '20px',
                                backgroundColor: '#f9fafb',
                                borderRadius: '8px'
                            }}>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Ticket ID</div>
                                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>#{selectedTicket.id}</div>
                                </div>
                                {selectedTicket.queue && (
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Queue</div>
                                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827', textTransform: 'capitalize' }}>{selectedTicket.queue}</div>
                                    </div>
                                )}
                                {selectedTicket.language && (
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Language</div>
                                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>{selectedTicket.language}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CSS Animations */}
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from {
                        transform: translateY(20px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
};

export default TicketList;