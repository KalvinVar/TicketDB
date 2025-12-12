import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Analytics {
  overview: {
    total_tickets: number;
    open_tickets: number;
    in_progress_tickets: number;
    resolved_tickets: number;
    closed_tickets: number;
    avg_resolution_days: number;
  };
  statusDistribution: Array<{ status: string; count: number }>;
  priorityDistribution: Array<{ priority: string; count: number }>;
  typeDistribution: Array<{ type: string; count: number }>;
  agentPerformance: Array<{
    agent_name: string;
    tickets_handled: number;
    tickets_resolved: number;
    avg_resolution_days: number;
    high_priority_handled: number;
  }>;
  departmentMetrics: Array<{
    department_name: string;
    ticket_count: number;
    resolved_count: number;
    avg_resolution_days: number;
  }>;
  timeSeriesData: Array<{
    date: string;
    tickets_created: number;
    tickets_resolved: number;
  }>;
}

const AnalyticsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { employee, hasPermission } = useAuth();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ 
    startDate: '2015-01-01', // Default to all time
    endDate: new Date().toISOString().split('T')[0]
  });
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    if (!employee) {
      navigate('/employee/login');
      return;
    }

    // Check permissions
    if (employee.role !== 'admin' && !hasPermission('view_all_tickets')) {
      alert('You do not have permission to view analytics');
      navigate('/employee/dashboard');
      return;
    }

    fetchAnalytics();
  }, [employee, navigate, hasPermission, dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      console.log('🔍 Fetching analytics...');
      console.log('Token exists:', !!token);
      console.log('Token preview:', token ? token.substring(0, 20) + '...' : 'null');
      console.log('Employee data:', employee);
      
      if (!token) {
        alert('No authentication token found. Please log in again.');
        navigate('/employee/login');
        return;
      }
      
      const response = await api.get('/analytics', {
        params: dateRange,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Analytics fetched successfully');
      setAnalytics(response.data);
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      if (error.response?.status === 401) {
        alert('Session expired. Please log in again.');
        navigate('/employee/login');
      } else {
        alert(error.response?.data?.error || 'Failed to load analytics');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExportLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('No authentication token found. Please log in again.');
        navigate('/employee/login');
        return;
      }
      
      const response = await api.get('/analytics/export?type=tickets', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `tickets_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: any) {
      console.error('Error exporting:', error);
      if (error.response?.status === 401) {
        alert('Session expired. Please log in again.');
        navigate('/employee/login');
      } else {
        alert('Failed to export data');
      }
    } finally {
      setExportLoading(false);
    }
  };

  if (loading || !analytics) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '18px', color: '#666' }}>Loading analytics...</div>
        </div>
      </div>
    );
  }

  // Chart configurations
  const timeSeriesConfig = {
    labels: analytics.timeSeriesData.map(d => new Date(d.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Tickets Created',
        data: analytics.timeSeriesData.map(d => d.tickets_created),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Tickets Resolved',
        data: analytics.timeSeriesData.map(d => d.tickets_resolved),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const statusDoughnutConfig = {
    labels: analytics.statusDistribution.map(s => s.status.replace('_', ' ').toUpperCase()),
    datasets: [{
      data: analytics.statusDistribution.map(s => s.count),
      backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#6b7280'],
      borderWidth: 0
    }]
  };

  const priorityBarConfig = {
    labels: analytics.priorityDistribution.map(p => p.priority.toUpperCase()),
    datasets: [{
      label: 'Tickets',
      data: analytics.priorityDistribution.map(p => p.count),
      backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
      borderRadius: 8
    }]
  };

  const typeBarConfig = {
    labels: analytics.typeDistribution.map(t => t.type.toUpperCase()),
    datasets: [{
      label: 'Tickets',
      data: analytics.typeDistribution.map(t => t.count),
      backgroundColor: '#667eea',
      borderRadius: 8
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { padding: 15, font: { size: 12 } }
      }
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📊 Analytics Dashboard</h1>
          <p style={styles.subtitle}>Comprehensive ticket insights and performance metrics</p>
        </div>
        <button onClick={() => navigate('/employee/dashboard')} style={styles.backButton}>
          ← Back to Dashboard
        </button>
      </div>

      {/* Date Range Filter */}
      <div style={styles.filterBar}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
            Date Range:
          </label>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            style={styles.dateInput}
          />
          <span style={{ color: '#6b7280' }}>to</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            style={styles.dateInput}
          />
          <button onClick={fetchAnalytics} style={styles.refreshButton}>
            🔄 Refresh
          </button>
          <button onClick={handleExport} disabled={exportLoading} style={styles.exportButton}>
            {exportLoading ? '⏳ Exporting...' : '📥 Export CSV'}
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Tickets</div>
          <div style={styles.statValue}>{analytics.overview.total_tickets}</div>
        </div>
        <div style={{ ...styles.statCard, borderTop: '4px solid #3b82f6' }}>
          <div style={styles.statLabel}>Open</div>
          <div style={{ ...styles.statValue, color: '#3b82f6' }}>{analytics.overview.open_tickets}</div>
        </div>
        <div style={{ ...styles.statCard, borderTop: '4px solid #f59e0b' }}>
          <div style={styles.statLabel}>In Progress</div>
          <div style={{ ...styles.statValue, color: '#f59e0b' }}>{analytics.overview.in_progress_tickets}</div>
        </div>
        <div style={{ ...styles.statCard, borderTop: '4px solid #10b981' }}>
          <div style={styles.statLabel}>Resolved</div>
          <div style={{ ...styles.statValue, color: '#10b981' }}>{analytics.overview.resolved_tickets}</div>
        </div>
        <div style={{ ...styles.statCard, borderTop: '4px solid #6b7280' }}>
          <div style={styles.statLabel}>Closed</div>
          <div style={{ ...styles.statValue, color: '#6b7280' }}>{analytics.overview.closed_tickets}</div>
        </div>
        <div style={{ ...styles.statCard, borderTop: '4px solid #8b5cf6' }}>
          <div style={styles.statLabel}>Avg. Resolution Time</div>
          <div style={{ ...styles.statValue, color: '#8b5cf6' }}>
            {analytics.overview.avg_resolution_days ? analytics.overview.avg_resolution_days.toFixed(1) : '0'} days
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={styles.chartsGrid}>
        {/* Time Series Chart */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Ticket Trends Over Time</h3>
          <div style={{ height: '300px', padding: '16px' }}>
            <Line data={timeSeriesConfig} options={chartOptions} />
          </div>
        </div>

        {/* Status Distribution */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Status Distribution</h3>
          <div style={{ height: '300px', padding: '16px' }}>
            <Doughnut data={statusDoughnutConfig} options={chartOptions} />
          </div>
        </div>

        {/* Priority Distribution */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Priority Breakdown</h3>
          <div style={{ height: '300px', padding: '16px' }}>
            <Bar data={priorityBarConfig} options={chartOptions} />
          </div>
        </div>

        {/* Type Distribution */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Ticket Types</h3>
          <div style={{ height: '300px', padding: '16px' }}>
            <Bar data={typeBarConfig} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Agent Performance Table */}
      <div style={styles.tableCard}>
        <h3 style={styles.chartTitle}>Top Performing Agents</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Agent</th>
                <th style={styles.th}>Tickets Handled</th>
                <th style={styles.th}>Resolved</th>
                <th style={styles.th}>Avg. Resolution Time</th>
                <th style={styles.th}>High Priority</th>
                <th style={styles.th}>Success Rate</th>
              </tr>
            </thead>
            <tbody>
              {analytics.agentPerformance.map((agent, idx) => (
                <tr key={idx} style={styles.tr}>
                  <td style={styles.td}>{agent.agent_name}</td>
                  <td style={styles.td}>{agent.tickets_handled}</td>
                  <td style={styles.td}>{agent.tickets_resolved}</td>
                  <td style={styles.td}>
                    {agent.avg_resolution_days ? agent.avg_resolution_days.toFixed(1) : '0'} days
                  </td>
                  <td style={styles.td}>{agent.high_priority_handled}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: ((agent.tickets_resolved / agent.tickets_handled) * 100) >= 80 ? '#d1fae5' : '#fed7aa',
                      color: ((agent.tickets_resolved / agent.tickets_handled) * 100) >= 80 ? '#065f46' : '#92400e'
                    }}>
                      {((agent.tickets_resolved / agent.tickets_handled) * 100).toFixed(0)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Department Performance Table */}
      <div style={styles.tableCard}>
        <h3 style={styles.chartTitle}>Department Performance</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Department</th>
                <th style={styles.th}>Total Tickets</th>
                <th style={styles.th}>Resolved</th>
                <th style={styles.th}>Avg. Resolution Time</th>
                <th style={styles.th}>Resolution Rate</th>
              </tr>
            </thead>
            <tbody>
              {analytics.departmentMetrics.map((dept, idx) => (
                <tr key={idx} style={styles.tr}>
                  <td style={styles.td}>{dept.department_name}</td>
                  <td style={styles.td}>{dept.ticket_count}</td>
                  <td style={styles.td}>{dept.resolved_count}</td>
                  <td style={styles.td}>
                    {dept.avg_resolution_days ? dept.avg_resolution_days.toFixed(1) : '0'} days
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: ((dept.resolved_count / dept.ticket_count) * 100) >= 80 ? '#d1fae5' : '#fed7aa',
                      color: ((dept.resolved_count / dept.ticket_count) * 100) >= 80 ? '#065f46' : '#92400e'
                    }}>
                      {((dept.resolved_count / dept.ticket_count) * 100).toFixed(0)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    padding: '20px'
  },
  header: {
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    padding: '32px',
    borderRadius: '24px',
    marginBottom: '24px',
    boxShadow: '0 8px 30px rgba(245, 158, 11, 0.3)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    fontSize: '36px',
    fontWeight: '800' as const,
    color: '#ffffff',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: 'rgba(255, 255, 255, 0.9)',
    margin: 0
  },
  backButton: {
    padding: '12px 24px',
    background: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '700' as const,
    cursor: 'pointer',
    transition: 'all 0.3s',
    ':hover': {
      background: 'rgba(255, 255, 255, 0.3)'
    }
  },
  filterBar: {
    background: '#ffffff',
    padding: '20px 24px',
    borderRadius: '16px',
    marginBottom: '24px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
    border: '2px solid rgba(245, 158, 11, 0.1)'
  },
  dateInput: {
    padding: '10px 14px',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '14px',
    backgroundColor: '#f9fafb',
    transition: 'all 0.3s'
  },
  refreshButton: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    border: 'none',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '700' as const,
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
  },
  exportButton: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: 'none',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '700' as const,
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  statCard: {
    background: '#ffffff',
    padding: '24px',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
    borderTop: '4px solid #f59e0b'
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '600' as const,
    marginBottom: '8px'
  },
  statValue: {
    fontSize: '32px',
    fontWeight: '800' as const,
    color: '#f59e0b'
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '20px',
    marginBottom: '24px'
  },
  chartCard: {
    background: '#ffffff',
    padding: '24px',
    borderRadius: '20px',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
    border: '2px solid rgba(245, 158, 11, 0.1)'
  },
  chartTitle: {
    fontSize: '18px',
    fontWeight: '700' as const,
    color: '#111827',
    marginBottom: '16px',
    marginTop: 0
  },
  tableCard: {
    background: '#ffffff',
    padding: '24px',
    borderRadius: '20px',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
    border: '2px solid rgba(245, 158, 11, 0.1)',
    marginBottom: '24px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const
  },
  th: {
    textAlign: 'left' as const,
    padding: '12px 16px',
    fontSize: '13px',
    fontWeight: '700' as const,
    color: '#374151',
    borderBottom: '2px solid #e5e7eb',
    backgroundColor: '#f9fafb'
  },
  tr: {
    transition: 'background-color 0.2s'
  },
  td: {
    padding: '14px 16px',
    fontSize: '14px',
    color: '#4b5563',
    borderBottom: '1px solid #f3f4f6'
  },
  badge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '700' as const,
    display: 'inline-block'
  }
};

export default AnalyticsDashboard;
