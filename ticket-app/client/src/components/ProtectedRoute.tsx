import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireEmployee?: boolean;
  requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireEmployee = false,
  requireAdmin = false,
}) => {
  const { isAuthenticated, isEmployee, isAdmin } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/user/login" replace />;
  }

  if (requireEmployee && !isEmployee) {
    return <Navigate to="/employee/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/employee/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
