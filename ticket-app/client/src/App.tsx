import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import UserLogin from './pages/UserLogin';
import EmployeeLogin from './pages/EmployeeLogin';
import UserDashboard from './pages/UserDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import CreateTicket from './pages/CreateTicket';
import UserTickets from './pages/UserTickets';
import TicketList from './components/TicketList';
import ManageEmployees from './pages/ManageEmployees';
import AuditLogs from './pages/AuditLogs';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Redirect root to user login */}
          <Route path="/" element={<Navigate to="/user/login" replace />} />
          
          {/* Public routes */}
          <Route path="/user/login" element={<UserLogin />} />
          <Route path="/employee/login" element={<EmployeeLogin />} />
          
          {/* Protected user routes */}
          <Route
            path="/user/dashboard"
            element={
              <ProtectedRoute>
                <UserDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/user/create-ticket"
            element={
              <ProtectedRoute>
                <CreateTicket />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/user/tickets"
            element={
              <ProtectedRoute>
                <UserTickets />
              </ProtectedRoute>
            }
          />
          
          {/* Protected employee routes */}
          <Route
            path="/employee/dashboard"
            element={
              <ProtectedRoute requireEmployee>
                <EmployeeDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/employee/tickets"
            element={
              <ProtectedRoute requireEmployee>
                <TicketList />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/employee/manage-employees"
            element={
              <ProtectedRoute requireEmployee>
                <ManageEmployees />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/employee/audit-logs"
            element={
              <ProtectedRoute requireEmployee>
                <AuditLogs />
              </ProtectedRoute>
            }
          />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;