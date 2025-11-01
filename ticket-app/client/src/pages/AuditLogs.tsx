import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface AuditLog {
  id: number;
  employee_id: number | null;
  employee_email: string | null;
  employee_name: string | null;
  action_type: string;
  action_description: string;
  target_type: string | null;
  target_id: number | null;
  target_employee_name: string | null;
  target_employee_email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  request_data: string | null;
  created_at: string;
}

const AuditLogs: React.FC = () => {
  const { token, isAdmin, hasPermission } = useAuth();
  const navigate = useNavigate();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [actionTypeFilter, setActionTypeFilter] = useState('all');
  const [employeeNameFilter, setEmployeeNameFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage] = useState(50);
  const [totalLogs, setTotalLogs] = useState(0);

  // Modal state for viewing details
  const [showModal, setShowModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Check if user has admin access (role=admin OR has admin_access permission) OR has view_audit_logs permission
  const hasAdminAccess = isAdmin || hasPermission('admin_access');
  const hasViewAuditLogs = hasPermission('view_audit_logs');
  const canViewAuditLogs = hasAdminAccess || hasViewAuditLogs;

  useEffect(() => {
    if (!canViewAuditLogs) {
      navigate('/employee/dashboard');
      return;
    }
    fetchLogs();
  }, [currentPage, actionTypeFilter, employeeNameFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: any = {
        limit: logsPerPage,
        offset: (currentPage - 1) * logsPerPage,
      };

      if (actionTypeFilter !== 'all') {
        params.action_type = actionTypeFilter;
      }

      if (employeeNameFilter) {
        params.employee_name = employeeNameFilter;
      }

      const response = await api.get('/audit-logs', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });

      setLogs(response.data.logs || []);
      setTotalLogs(response.data.total || 0);
    } catch (err: any) {
      setError('Failed to load audit logs: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    // SQLite stores in UTC, need to append 'Z' to parse as UTC
    const date = new Date(dateString + 'Z');
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActionTypeBadgeColor = (actionType: string) => {
    if (actionType.includes('CREATE')) return '#10b981';
    if (actionType.includes('UPDATE') || actionType.includes('CHANGE')) return '#f59e0b';
    if (actionType.includes('DELETE')) return '#ef4444';
    return '#6b7280';
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      log.action_description.toLowerCase().includes(searchLower) ||
      log.employee_name?.toLowerCase().includes(searchLower) ||
      log.employee_email?.toLowerCase().includes(searchLower) ||
      log.action_type.toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(totalLogs / logsPerPage);

  if (!canViewAuditLogs) {
    return null;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Security Audit Logs</h1>
          <p style={styles.subtitle}>Track all security-sensitive actions in the system</p>
        </div>
        <button onClick={() => navigate('/employee/dashboard')} style={styles.backButton}>
          ← Back to Dashboard
        </button>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          {error}
        </div>
      )}

      {/* Filters */}
      <div style={styles.filterBar}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Action Type:</label>
          <select
            value={actionTypeFilter}
            onChange={(e) => {
              setActionTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={styles.filterSelect}
          >
            <option value="all">All Actions</option>
            <option value="EMPLOYEE_CREATE">Employee Created</option>
            <option value="EMPLOYEE_PERMISSION_UPDATE">Permission Updated</option>
            <option value="EMPLOYEE_STATUS_CHANGE">Status Changed</option>
            <option value="EMPLOYEE_PASSWORD_CHANGE">Password Changed</option>
            <option value="DEPARTMENT_CREATE">Department Created</option>
            <option value="DEPARTMENT_UPDATE">Department Updated</option>
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Employee Name:</label>
          <input
            type="text"
            value={employeeNameFilter}
            onChange={(e) => {
              setEmployeeNameFilter(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Filter by employee name"
            style={styles.filterInput}
          />
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Search:</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search description, name, email..."
            style={styles.searchInput}
          />
        </div>

        <button onClick={fetchLogs} style={styles.refreshButton}>
          🔄 Refresh
        </button>
      </div>

      {/* Stats */}
      <div style={styles.statsBar}>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Total Logs:</span>
          <span style={styles.statValue}>{totalLogs}</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Showing:</span>
          <span style={styles.statValue}>
            {Math.min((currentPage - 1) * logsPerPage + 1, totalLogs)} - {Math.min(currentPage * logsPerPage, totalLogs)}
          </span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Page:</span>
          <span style={styles.statValue}>{currentPage} of {totalPages || 1}</span>
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading audit logs...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>No audit logs found</p>
          <p style={styles.emptySubtext}>
            {searchTerm ? 'Try adjusting your search filters' : 'Audit logs will appear here as actions are performed'}
          </p>
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Timestamp</th>
                <th style={styles.th}>Employee</th>
                <th style={styles.th}>Action Type</th>
                <th style={styles.th}>Description</th>
                <th style={styles.th}>IP Address</th>
                <th style={styles.th}>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} style={styles.tr}>
                  <td style={styles.td}>{log.id}</td>
                  <td style={styles.td}>
                    <div style={styles.timestamp}>{formatDate(log.created_at)}</div>
                  </td>
                  <td style={styles.td}>
                    {log.employee_name ? (
                      <div>
                        <div style={styles.employeeName}>{log.employee_name}</div>
                        <div style={styles.employeeEmail}>{log.employee_email}</div>
                      </div>
                    ) : (
                      <span style={styles.systemText}>System</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: getActionTypeBadgeColor(log.action_type),
                    }}>
                      {log.action_type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.description}>{log.action_description}</div>
                    {log.target_type && (
                      <div style={styles.targetInfo}>
                        Target: {log.target_type} #{log.target_id}
                        {log.target_employee_name && ` - ${log.target_employee_name}`}
                      </div>
                    )}
                  </td>
                  <td style={styles.td}>
                    <code style={styles.code}>{log.ip_address || 'N/A'}</code>
                  </td>
                  <td style={styles.td}>
                    {log.request_data && (
                      <button
                        onClick={() => {
                          setSelectedLog(log);
                          setShowModal(true);
                        }}
                        style={styles.detailsButton}
                      >
                        View
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            style={{
              ...styles.paginationButton,
              ...(currentPage === 1 ? styles.paginationButtonDisabled : {})
            }}
          >
            ← Previous
          </button>
          
          <div style={styles.pageNumbers}>
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
                    ...styles.pageButton,
                    ...(currentPage === pageNum ? styles.pageButtonActive : {})
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
              ...styles.paginationButton,
              ...(currentPage === totalPages ? styles.paginationButtonDisabled : {})
            }}
          >
            Next →
          </button>
        </div>
      )}

      {/* Details Modal */}
      {showModal && selectedLog && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Audit Log Details #{selectedLog.id}</h2>
              <button onClick={() => setShowModal(false)} style={styles.modalCloseButton}>
                ✕
              </button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.modalSection}>
                <h3 style={styles.modalSectionTitle}>📋 Action Information</h3>
                <div style={styles.modalRow}>
                  <span style={styles.modalLabel}>Action Type:</span>
                  <span style={{...styles.badge, backgroundColor: getActionTypeBadgeColor(selectedLog.action_type)}}>
                    {selectedLog.action_type.replace(/_/g, ' ')}
                  </span>
                </div>
                <div style={styles.modalRow}>
                  <span style={styles.modalLabel}>Description:</span>
                  <span style={styles.modalValue}>{selectedLog.action_description}</span>
                </div>
                {selectedLog.target_type && (
                  <div style={styles.modalRow}>
                    <span style={styles.modalLabel}>Target:</span>
                    <span style={styles.modalValue}>
                      {selectedLog.target_type} #{selectedLog.target_id}
                      {selectedLog.target_employee_name && ` - ${selectedLog.target_employee_name}`}
                    </span>
                  </div>
                )}
              </div>

              <div style={styles.modalSection}>
                <h3 style={styles.modalSectionTitle}>👤 Performing Employee</h3>
                {selectedLog.employee_name ? (
                  <>
                    <div style={styles.modalRow}>
                      <span style={styles.modalLabel}>Name:</span>
                      <span style={styles.modalValue}>{selectedLog.employee_name}</span>
                    </div>
                    <div style={styles.modalRow}>
                      <span style={styles.modalLabel}>Email:</span>
                      <span style={styles.modalValue}>{selectedLog.employee_email}</span>
                    </div>
                    <div style={styles.modalRow}>
                      <span style={styles.modalLabel}>Employee ID:</span>
                      <span style={styles.modalValue}>#{selectedLog.employee_id}</span>
                    </div>
                  </>
                ) : (
                  <div style={styles.modalRow}>
                    <span style={styles.systemText}>System Action</span>
                  </div>
                )}
              </div>

              {selectedLog.target_employee_name && (
                <div style={styles.modalSection}>
                  <h3 style={styles.modalSectionTitle}>🎯 Target Employee</h3>
                  <div style={styles.modalRow}>
                    <span style={styles.modalLabel}>Name:</span>
                    <span style={styles.modalValue}>{selectedLog.target_employee_name}</span>
                  </div>
                  <div style={styles.modalRow}>
                    <span style={styles.modalLabel}>Email:</span>
                    <span style={styles.modalValue}>{selectedLog.target_employee_email}</span>
                  </div>
                  <div style={styles.modalRow}>
                    <span style={styles.modalLabel}>Employee ID:</span>
                    <span style={styles.modalValue}>#{selectedLog.target_id}</span>
                  </div>
                </div>
              )}

              <div style={styles.modalSection}>
                <h3 style={styles.modalSectionTitle}>🌐 Request Information</h3>
                <div style={styles.modalRow}>
                  <span style={styles.modalLabel}>Timestamp:</span>
                  <span style={styles.modalValue}>{formatDate(selectedLog.created_at)}</span>
                </div>
                <div style={styles.modalRow}>
                  <span style={styles.modalLabel}>IP Address:</span>
                  <code style={styles.code}>{selectedLog.ip_address || 'N/A'}</code>
                </div>
                <div style={styles.modalRow}>
                  <span style={styles.modalLabel}>User Agent:</span>
                  <span style={styles.modalValueSmall}>{selectedLog.user_agent || 'N/A'}</span>
                </div>
              </div>

              {selectedLog.request_data && (
                <div style={styles.modalSection}>
                  <h3 style={styles.modalSectionTitle}>📦 Request Data</h3>
                  <pre style={styles.codeBlock}>
                    {(() => {
                      try {
                        const data = JSON.parse(selectedLog.request_data);
                        return JSON.stringify(data, null, 2);
                      } catch {
                        return selectedLog.request_data;
                      }
                    })()}
                  </pre>
                </div>
              )}
            </div>

            <div style={styles.modalFooter}>
              <button onClick={() => setShowModal(false)} style={styles.modalButton}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1f2937',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  backButton: {
    padding: '10px 20px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  errorBanner: {
    padding: '12px 16px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #fecaca',
  },
  filterBar: {
    display: 'flex',
    gap: '15px',
    marginBottom: '20px',
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    flexWrap: 'wrap' as 'wrap',
    alignItems: 'flex-end',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column' as 'column',
    gap: '6px',
  },
  filterLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#4b5563',
    textTransform: 'uppercase' as 'uppercase',
  },
  filterSelect: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    minWidth: '200px',
  },
  filterInput: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    width: '150px',
  },
  searchInput: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    minWidth: '300px',
  },
  refreshButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  statsBar: {
    display: 'flex',
    gap: '20px',
    marginBottom: '20px',
    padding: '15px 20px',
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
  },
  stat: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: '500',
  },
  statValue: {
    fontSize: '14px',
    color: '#1f2937',
    fontWeight: '700',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column' as 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    color: '#6b7280',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  emptyState: {
    textAlign: 'center' as 'center',
    padding: '60px 20px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  emptyText: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#4b5563',
    margin: '0 0 8px 0',
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#9ca3af',
    margin: 0,
  },
  tableContainer: {
    overflowX: 'auto' as 'auto',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as 'collapse',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left' as 'left',
    fontSize: '12px',
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase' as 'uppercase',
    backgroundColor: '#f9fafb',
    borderBottom: '2px solid #e5e7eb',
  },
  tr: {
    borderBottom: '1px solid #e5e7eb',
    transition: 'background-color 0.2s',
    cursor: 'pointer',
  },
  td: {
    padding: '12px 16px',
    fontSize: '14px',
    color: '#1f2937',
  },
  timestamp: {
    fontSize: '13px',
    color: '#4b5563',
    whiteSpace: 'nowrap' as 'nowrap',
  },
  employeeName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
  },
  employeeEmail: {
    fontSize: '12px',
    color: '#6b7280',
  },
  systemText: {
    fontSize: '13px',
    color: '#9ca3af',
    fontStyle: 'italic' as 'italic',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'white',
    textTransform: 'uppercase' as 'uppercase',
    whiteSpace: 'nowrap' as 'nowrap',
  },
  description: {
    fontSize: '14px',
    color: '#1f2937',
    lineHeight: '1.5',
  },
  targetInfo: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px',
  },
  code: {
    fontSize: '12px',
    fontFamily: 'monospace',
    backgroundColor: '#f3f4f6',
    padding: '2px 6px',
    borderRadius: '4px',
    color: '#1f2937',
  },
  detailsButton: {
    padding: '4px 12px',
    backgroundColor: '#e0e7ff',
    color: '#3730a3',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '10px',
    marginTop: '30px',
  },
  paginationButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  paginationButtonDisabled: {
    backgroundColor: '#e5e7eb',
    color: '#9ca3af',
    cursor: 'not-allowed',
  },
  pageNumbers: {
    display: 'flex',
    gap: '5px',
  },
  pageButton: {
    padding: '8px 12px',
    backgroundColor: 'white',
    color: '#4b5563',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  pageButtonActive: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: '1px solid #3b82f6',
  },
  modalOverlay: {
    position: 'fixed' as 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px',
    borderBottom: '1px solid #e5e7eb',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0,
  },
  modalCloseButton: {
    padding: '8px 12px',
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '20px',
    fontWeight: '700',
    lineHeight: 1,
  },
  modalBody: {
    padding: '24px',
  },
  modalSection: {
    marginBottom: '24px',
  },
  modalSectionTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase' as 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '12px',
  },
  modalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '10px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  modalLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b7280',
    minWidth: '140px',
  },
  modalValue: {
    fontSize: '14px',
    color: '#1f2937',
    flex: 1,
    textAlign: 'right' as 'right',
  },
  modalValueSmall: {
    fontSize: '12px',
    color: '#1f2937',
    flex: 1,
    textAlign: 'right' as 'right',
    wordBreak: 'break-all' as 'break-all',
  },
  codeBlock: {
    backgroundColor: '#1f2937',
    color: '#10b981',
    padding: '16px',
    borderRadius: '8px',
    fontSize: '12px',
    fontFamily: 'monospace',
    overflow: 'auto',
    maxHeight: '300px',
  },
  modalFooter: {
    padding: '16px 24px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  modalButton: {
    padding: '10px 24px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
};

export default AuditLogs;
