import TicketList from './components/TicketList';

function App() {
  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        padding: '20px 0',
        marginBottom: '32px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px'
        }}>
          <h1 style={{
            margin: 0,
            fontSize: '28px',
            fontWeight: '700',
            color: '#111827',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '32px' }}>🎫</span>
            Ticket Management System
          </h1>
          <p style={{
            margin: '8px 0 0 0',
            color: '#6b7280',
            fontSize: '14px'
          }}>
            View and manage support tickets
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px 40px'
      }}>
        <TicketList />
      </div>
    </div>
  );
}

export default App;