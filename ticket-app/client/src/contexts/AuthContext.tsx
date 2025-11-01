import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  company?: string;
}

interface Employee {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  department_id: number;
  department_name?: string;
  role: 'admin' | 'manager' | 'agent' | 'viewer';
  permissions: (number | string)[]; // Can be IDs (numbers) or names (strings)
}

interface AuthContextType {
  user: User | null;
  employee: Employee | null;
  token: string | null;
  isAuthenticated: boolean;
  isEmployee: boolean;
  isAdmin: boolean;
  loginUser: (email: string, password: string) => Promise<void>;
  loginEmployee: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  refreshEmployeePermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Load saved auth data from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const savedEmployee = localStorage.getItem('employee');

    if (savedToken) {
      setToken(savedToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
    }

    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse saved user', e);
      }
    }

    if (savedEmployee) {
      try {
        setEmployee(JSON.parse(savedEmployee));
      } catch (e) {
        console.error('Failed to parse saved employee', e);
      }
    }
  }, []);

  const loginUser = async (email: string, password: string) => {
    try {
      const response = await axios.post('http://localhost:3001/api/auth/user/login', {
        email,
        password,
      });

      const { token: newToken, user: userData } = response.data;

      setToken(newToken);
      setUser(userData);
      setEmployee(null);

      // Save to localStorage
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.removeItem('employee');

      // Set default axios header
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  };

  const loginEmployee = async (email: string, password: string) => {
    try {
      const response = await axios.post('http://localhost:3001/api/auth/employee/login', {
        email,
        password,
      });

      const { token: newToken, employee: employeeData } = response.data;

      setToken(newToken);
      setEmployee(employeeData);
      setUser(null);

      // Save to localStorage
      localStorage.setItem('token', newToken);
      localStorage.setItem('employee', JSON.stringify(employeeData));
      localStorage.removeItem('user');

      // Set default axios header
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setEmployee(null);

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('employee');

    delete axios.defaults.headers.common['Authorization'];
  };

  const hasPermission = (permission: string): boolean => {
    if (!employee) return false;
    if (employee.role === 'admin') return true;
    return employee.permissions.includes(permission);
  };

  const refreshEmployeePermissions = async (): Promise<void> => {
    if (!employee || !token) {
      throw new Error('Not logged in as employee');
    }

    try {
      const response = await axios.post('http://localhost:3001/api/auth/employee/refresh', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const { token: newToken, employee: employeeData } = response.data;

      setToken(newToken);
      setEmployee(employeeData);

      // Update localStorage
      localStorage.setItem('token', newToken);
      localStorage.setItem('employee', JSON.stringify(employeeData));

      // Update default axios header
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to refresh permissions');
    }
  };

  const isAuthenticated = !!(token && (user || employee));
  const isEmployee = !!employee;
  const isAdmin = employee?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        employee,
        token,
        isAuthenticated,
        isEmployee,
        isAdmin,
        loginUser,
        loginEmployee,
        logout,
        hasPermission,
        refreshEmployeePermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
