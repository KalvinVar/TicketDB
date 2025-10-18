import React from 'react';

interface TicketItemProps {
    ticket: {
        id: number;
        title: string;
        description: string;
        status?: string;
        priority?: string;
        queue?: string;
        language?: string;
    };
}

const TicketItem: React.FC<TicketItemProps> = ({ ticket }) => {
    const getPriorityColor = (priority?: string) => {
        switch(priority?.toLowerCase()) {
            case 'high': return '#ef4444';
            case 'medium': return '#f59e0b';
            case 'low': return '#10b981';
            default: return '#6b7280';
        }
    };

    const getStatusColor = (status?: string) => {
        switch(status?.toLowerCase()) {
            case 'open': return '#3b82f6';
            case 'closed': return '#6b7280';
            case 'in_progress': return '#8b5cf6';
            case 'resolved': return '#10b981';
            default: return '#6b7280';
        }
    };

    return (
        <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '16px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s',
            cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
            e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
            e.currentTarget.style.transform = 'translateY(0)';
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                <h3 style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: '18px', 
                    fontWeight: '600',
                    color: '#111827',
                    flex: 1
                }}>
                    {ticket.title || 'Untitled Ticket'}
                </h3>
                <span style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    backgroundColor: '#f3f4f6',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontWeight: '500'
                }}>
                    #{ticket.id}
                </span>
            </div>

            <p style={{ 
                margin: '0 0 16px 0', 
                color: '#4b5563',
                fontSize: '14px',
                lineHeight: '1.6',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
            }}>
                {ticket.description || 'No description available'}
            </p>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                {ticket.priority && (
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        color: getPriorityColor(ticket.priority),
                        backgroundColor: `${getPriorityColor(ticket.priority)}15`,
                        padding: '4px 10px',
                        borderRadius: '12px',
                    }}>
                        <span style={{ fontSize: '8px' }}>●</span>
                        {ticket.priority}
                    </span>
                )}
                
                {ticket.status && (
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        color: getStatusColor(ticket.status),
                        backgroundColor: `${getStatusColor(ticket.status)}15`,
                        padding: '4px 10px',
                        borderRadius: '12px',
                    }}>
                        {ticket.status}
                    </span>
                )}

                {ticket.queue && (
                    <span style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        padding: '4px 10px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb'
                    }}>
                        📁 {ticket.queue}
                    </span>
                )}

                {ticket.language && (
                    <span style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        padding: '4px 10px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb'
                    }}>
                        🌐 {ticket.language}
                    </span>
                )}
            </div>
        </div>
    );
};

export default TicketItem;