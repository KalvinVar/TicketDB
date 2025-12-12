import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface Employee {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  department_id: number;
  department_name: string;
  role: string;
  permissions: (number | string)[]; // Backend can return numbers, frontend uses strings
  is_active: boolean;
  created_at: string;
}

interface Department {
  id: number;
  name: string;
  description?: string;
}

interface Permission {
  id: number;
  name: string;
  description?: string;
}

const ManageEmployees: React.FC = () => {
  const { token, isAdmin, employee, hasPermission } = useAuth();
  const navigate = useNavigate();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal states
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editForm, setEditForm] = useState({
    role: '',
    department_id: '',
    permissions: [] as string[],
  });
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    department_id: employee?.department_id?.toString() || '',
    role: 'agent',
    permissions: [] as string[],
  });

  useEffect(() => {
    // Check if user has permission to manage employees
    if (!isAdmin && !hasPermission('manage_employees')) {
      navigate('/employee/dashboard');
      return;
    }
    fetchData();
  }, [isAdmin, hasPermission]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [employeesRes, departmentsRes, permissionsRes] = await Promise.all([
        api.get('/employees', { headers: { Authorization: `Bearer ${token}` } }),
        api.get('/departments', { headers: { Authorization: `Bearer ${token}` } }),
        api.get('/permissions', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      console.log('Fetched employees:', employeesRes.data);
      console.log('Fetched permissions:', permissionsRes.data);
      
      setEmployees(employeesRes.data);
      setDepartments(departmentsRes.data);
      setPermissions(permissionsRes.data);
    } catch (err: any) {
      setError('Failed to load data: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEditEmployee = (emp: Employee) => {
    // Prevent editing own permissions
    if (emp.id === employee?.id) {
      alert('You cannot edit your own permissions. Ask a higher-level administrator to make changes to your account.');
      return;
    }
    
    console.log('Editing employee:', emp);
    console.log('Employee permissions:', emp.permissions);
    
    setSelectedEmployee(emp);
    
    // Ensure permissions is an array and filter out any null/undefined values
    const permissionIds = Array.isArray(emp.permissions) 
      ? emp.permissions.filter(p => p != null).map(p => String(p))
      : [];
    
    console.log('Converted permission IDs:', permissionIds);
    
    setEditForm({
      role: emp.role,
      department_id: emp.department_id.toString(),
      permissions: permissionIds,
    });
    setShowEditModal(true);
  };

  const submitEdit = async () => {
    if (!selectedEmployee) return;

    try {
      await api.put(
        `/employees/${selectedEmployee.id}/permissions`,
        {
          role: editForm.role,
          department_id: parseInt(editForm.department_id),
          permissions: editForm.permissions.map(p => parseInt(p)),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowEditModal(false);
      fetchData();
      alert('Employee updated successfully');
    } catch (err: any) {
      alert('Failed to update employee: ' + (err.response?.data?.error || err.message));
    }
  };

  const toggleEmployeeStatus = async (employee: Employee) => {
    // Prevent non-admins from deactivating admins
    if (employee.role === 'admin' && !isAdmin) {
      alert('Only admins can activate/deactivate other admin accounts');
      return;
    }

    if (!confirm(`Are you sure you want to ${employee.is_active ? 'deactivate' : 'activate'} ${employee.first_name} ${employee.last_name}?`)) {
      return;
    }

    try {
      await api.patch(
        `/employees/${employee.id}/status`,
        { is_active: !employee.is_active },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      fetchData();
      alert(`Employee ${employee.is_active ? 'deactivated' : 'activated'} successfully`);
    } catch (err: any) {
      alert('Failed to update status: ' + (err.response?.data?.error || err.message));
    }
  };

  const togglePermission = (permissionId: string) => {
    setEditForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId],
    }));
  };

  const toggleCreatePermission = (permissionId: string) => {
    setCreateForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId],
    }));
  };

  const submitCreate = async () => {
    // Validation
    if (!createForm.email || !createForm.password || !createForm.first_name || !createForm.last_name || !createForm.department_id) {
      alert('Please fill in all required fields');
      return;
    }

    if (createForm.password.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }

    try {
      await api.post(
        '/employees',
        {
          ...createForm,
          department_id: parseInt(createForm.department_id),
          permissions: createForm.permissions.map(p => parseInt(p)),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowCreateModal(false);
      setCreateForm({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        department_id: employee?.department_id?.toString() || '',
        role: 'agent',
        permissions: [],
      });
      fetchData();
      alert('Employee created successfully');
    } catch (err: any) {
      alert('Failed to create employee: ' + (err.response?.data?.error || err.message));
    }
  };

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      searchQuery === '' ||
      emp.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' || emp.role === roleFilter;
    const matchesDepartment = departmentFilter === 'all' || emp.department_id.toString() === departmentFilter;
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? emp.is_active : !emp.is_active);

    return matchesSearch && matchesRole && matchesDepartment && matchesStatus;
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return '#ef4444';
      case 'manager':
        return '#f59e0b';
      case 'agent':
        return '#10b981';
      case 'viewer':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading employee data...</div>;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate('/employee/dashboard')} style={styles.backButton}>
          ← Back to Dashboard
        </button>
        <h1 style={styles.title}>Employee Management</h1>
        <button onClick={() => setShowCreateModal(true)} style={styles.createButton}>
          + Create Employee
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {/* Filter Bar */}
      <div style={styles.filterBar}>
        <input
          type="text"
          placeholder="Search employees..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />

        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={styles.select}>
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="agent">Agent</option>
          <option value="viewer">Viewer</option>
        </select>

        <select value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)} style={styles.select}>
          <option value="all">All Departments</option>
          {departments.map(dept => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={styles.select}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <button
          onClick={() => {
            setSearchQuery('');
            setRoleFilter('all');
            setDepartmentFilter('all');
            setStatusFilter('all');
          }}
          style={styles.clearButton}
        >
          Clear
        </button>
      </div>

      {/* Stats */}
      <div style={styles.stats}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{filteredEmployees.length}</div>
          <div style={styles.statLabel}>Employees</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{filteredEmployees.filter(e => e.is_active).length}</div>
          <div style={styles.statLabel}>Active</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{filteredEmployees.filter(e => e.role === 'admin').length}</div>
          <div style={styles.statLabel}>Admins</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{departments.length}</div>
          <div style={styles.statLabel}>Departments</div>
        </div>
      </div>

      {/* Employees Table */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Department</th>
              <th style={styles.th}>Role</th>
              <th style={styles.th}>Permissions</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map(employee => (
              <tr key={employee.id} style={styles.tableRow}>
                <td style={styles.td}>
                  {employee.first_name} {employee.last_name}
                </td>
                <td style={styles.td}>{employee.email}</td>
                <td style={styles.td}>{employee.department_name}</td>
                <td style={styles.td}>
                  <span
                    style={{
                      ...styles.badge,
                      backgroundColor: getRoleBadgeColor(employee.role),
                    }}
                  >
                    {employee.role}
                  </span>
                </td>
                <td style={styles.td}>
                  <span style={styles.permissionCount}>{employee.permissions.length} permissions</span>
                </td>
                <td style={styles.td}>
                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: employee.is_active ? '#10b981' : '#6b7280',
                    }}
                  >
                    {employee.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={styles.td}>
                  <div style={styles.actionButtons}>
                    <button onClick={() => handleEditEmployee(employee)} style={styles.editButton}>
                      Edit
                    </button>
                    <button
                      onClick={() => toggleEmployeeStatus(employee)}
                      style={{
                        ...styles.toggleButton,
                        backgroundColor: employee.is_active ? '#ef4444' : '#10b981',
                      }}
                    >
                      {employee.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredEmployees.length === 0 && (
          <div style={styles.emptyState}>No employees found matching your filters</div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedEmployee && (
        <div style={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2>
                Edit Employee: {selectedEmployee.first_name} {selectedEmployee.last_name}
              </h2>
              <button onClick={() => setShowEditModal(false)} style={styles.closeButton}>
                ×
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Role</label>
                <select
                  value={editForm.role}
                  onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                  style={styles.input}
                >
                  {/* Hierarchy: Admin > Manager > Agent > Viewer */}
                  {/* Users can only assign roles below their own level */}
                  
                  {/* Admin can assign any role */}
                  {isAdmin && <option value="admin">Admin</option>}
                  {isAdmin && <option value="manager">Manager</option>}
                  {isAdmin && <option value="agent">Agent</option>}
                  {isAdmin && <option value="viewer">Viewer</option>}
                  
                  {/* Manager can assign agent and viewer */}
                  {!isAdmin && employee?.role === 'manager' && (
                    <>
                      <option value="agent">Agent</option>
                      <option value="viewer">Viewer</option>
                    </>
                  )}
                  
                  {/* Agent can only assign viewer */}
                  {!isAdmin && employee?.role === 'agent' && (
                    <option value="viewer">Viewer</option>
                  )}
                </select>
                {employee?.role === 'manager' && (
                  <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    Note: Managers can only assign Agent or Viewer roles
                  </small>
                )}
                {employee?.role === 'agent' && (
                  <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    Note: Agents can only assign Viewer role
                  </small>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Department</label>
                <select
                  value={editForm.department_id}
                  onChange={e => setEditForm({ ...editForm, department_id: e.target.value })}
                  style={styles.input}
                  disabled={employee?.role === 'manager'}
                >
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                {employee?.role === 'manager' && (
                  <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    Note: Managers cannot move employees to other departments
                  </small>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Permissions</label>
                <div style={styles.permissionsGrid}>
                  {permissions.map(permission => {
                    // Check if this permission is restricted for the current user
                    const isRestrictedPermission = 
                      (permission.name === 'admin_access' && !isAdmin) ||
                      (permission.name === 'view_audit_logs' && !isAdmin) ||
                      (employee?.role === 'manager' && (permission.name === 'manage_employees' || permission.name === 'admin_access'));
                    
                    // Check if the employee being edited already has this permission
                    const employeeHasPermission = selectedEmployee?.permissions.includes(permission.id.toString());
                    
                    // Lock permission to current state if it's restricted AND employee already has it
                    const isLockedToCurrent = isRestrictedPermission && employeeHasPermission;
                    
                    // Disable if restricted and employee doesn't have it, OR if locked to current state
                    const isDisabled = isRestrictedPermission;
                    
                    return (
                      <label key={permission.id} style={{
                        ...styles.checkboxLabel,
                        opacity: isDisabled ? 0.5 : 1,
                        cursor: isDisabled ? 'not-allowed' : 'pointer'
                      }}>
                        <input
                          type="checkbox"
                          checked={editForm.permissions.includes(permission.id.toString())}
                          onChange={() => !isDisabled && togglePermission(permission.id.toString())}
                          style={styles.checkbox}
                          disabled={isDisabled}
                        />
                        <span style={styles.permissionName}>
                          {permission.name.replace(/_/g, ' ')}
                          {isLockedToCurrent && ' 🔒'}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {!isAdmin && (
                  <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '8px', display: 'block' }}>
                    {employee?.role === 'agent' && 'Note: You cannot grant or remove admin_access or view_audit_logs permissions. Locked permissions (🔒) cannot be changed.'}
                    {employee?.role === 'manager' && 'Note: You cannot grant or remove manage_employees, admin_access, or view_audit_logs permissions. Locked permissions (🔒) cannot be changed.'}
                  </small>
                )}
              </div>

              <div style={styles.modalActions}>
                <button onClick={submitEdit} style={styles.submitButton}>
                  Save Changes
                </button>
                <button onClick={() => setShowEditModal(false)} style={styles.cancelButton}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Employee Modal */}
      {showCreateModal && (
        <div style={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2>Create New Employee</h2>
              <button onClick={() => setShowCreateModal(false)} style={styles.closeButton}>
                ×
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Email *</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                  style={styles.input}
                  placeholder="employee@example.com"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Password * (min 8 characters)</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                  style={styles.input}
                  placeholder="••••••••"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>First Name *</label>
                  <input
                    type="text"
                    value={createForm.first_name}
                    onChange={e => setCreateForm({ ...createForm, first_name: e.target.value })}
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Last Name *</label>
                  <input
                    type="text"
                    value={createForm.last_name}
                    onChange={e => setCreateForm({ ...createForm, last_name: e.target.value })}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Role</label>
                <select
                  value={createForm.role}
                  onChange={e => setCreateForm({ ...createForm, role: e.target.value })}
                  style={styles.input}
                >
                  {/* Hierarchy: Admin > Manager > Agent > Viewer */}
                  {/* Users can only create roles below their own level */}
                  
                  {/* Admin can create any role */}
                  {isAdmin && <option value="admin">Admin</option>}
                  {isAdmin && <option value="manager">Manager</option>}
                  {isAdmin && <option value="agent">Agent</option>}
                  {isAdmin && <option value="viewer">Viewer</option>}
                  
                  {/* Manager can create agent and viewer */}
                  {!isAdmin && employee?.role === 'manager' && (
                    <>
                      <option value="agent">Agent</option>
                      <option value="viewer">Viewer</option>
                    </>
                  )}
                  
                  {/* Agent can only create viewer */}
                  {!isAdmin && employee?.role === 'agent' && (
                    <option value="viewer">Viewer</option>
                  )}
                </select>
                {employee?.role === 'manager' && (
                  <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    Note: Managers can only create Agents and Viewers
                  </small>
                )}
                {employee?.role === 'agent' && (
                  <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    Note: Agents can only create Viewers
                  </small>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Department *</label>
                <select
                  value={createForm.department_id}
                  onChange={e => setCreateForm({ ...createForm, department_id: e.target.value })}
                  style={styles.input}
                  disabled={employee?.role === 'manager'}
                >
                  {employee?.role === 'manager' ? (
                    // Manager can only create in their department
                    departments
                      .filter(dept => dept.id === employee.department_id)
                      .map(dept => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))
                  ) : (
                    // Admin and Agent can choose any department
                    departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Permissions</label>
                <div style={styles.permissionsGrid}>
                  {permissions.map(permission => {
                    // Restrict certain permissions based on role
                    const isRestricted = 
                      (permission.name === 'admin_access' && !isAdmin) ||
                      (permission.name === 'view_audit_logs' && !isAdmin) ||
                      (employee?.role === 'manager' && (permission.name === 'manage_employees' || permission.name === 'admin_access'));
                    
                    return (
                      <label key={permission.id} style={{
                        ...styles.checkboxLabel,
                        opacity: isRestricted ? 0.5 : 1,
                        cursor: isRestricted ? 'not-allowed' : 'pointer'
                      }}>
                        <input
                          type="checkbox"
                          checked={createForm.permissions.includes(permission.id.toString())}
                          onChange={() => !isRestricted && toggleCreatePermission(permission.id.toString())}
                          style={styles.checkbox}
                          disabled={isRestricted}
                        />
                        <span style={styles.permissionName}>
                          {permission.name.replace(/_/g, ' ')}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={styles.modalActions}>
                <button onClick={submitCreate} style={styles.submitButton}>
                  Create Employee
                </button>
                <button onClick={() => setShowCreateModal(false)} style={styles.cancelButton}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '32px',
    maxWidth: '1600px',
    margin: '0 auto',
    background: 'linear-gradient(135deg, #fae8ff 0%, #f3e8ff 100%)',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
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
    boxShadow: '0 4px 12px rgba(107, 114, 128, 0.3)',
  },
  createButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '700',
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(168, 85, 247, 0.4)',
  },
  title: {
    fontSize: '36px',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  filterBar: {
    display: 'flex',
    gap: '12px',
    marginBottom: '28px',
    flexWrap: 'wrap',
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '20px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
    border: '2px solid rgba(168, 85, 247, 0.1)',
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
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
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
    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },
  statCard: {
    padding: '28px',
    background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
    borderRadius: '20px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
    textAlign: 'center',
    border: '2px solid rgba(168, 85, 247, 0.1)',
    transition: 'all 0.3s',
  },
  statValue: {
    fontSize: '42px',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  statLabel: {
    fontSize: '15px',
    color: '#6b7280',
    marginTop: '8px',
    fontWeight: '600',
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '20px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
    overflow: 'auto',
    border: '2px solid rgba(168, 85, 247, 0.1)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
  },
  th: {
    padding: '18px',
    textAlign: 'left',
    fontSize: '14px',
    fontWeight: '700',
    color: '#6b21a8',
    borderBottom: '2px solid #e9d5ff',
    textTransform: 'uppercase',
  },
  tableRow: {
    borderBottom: '1px solid #e5e7eb',
  },
  td: {
    padding: '15px',
    fontSize: '14px',
    color: '#4b5563',
  },
  badge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    color: 'white',
    textTransform: 'uppercase',
  },
  permissionCount: {
    fontSize: '13px',
    color: '#6b7280',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    color: 'white',
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
  },
  editButton: {
    padding: '8px 16px',
    background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '700',
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(168, 85, 247, 0.3)',
  },
  toggleButton: {
    padding: '8px 16px',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '700',
    transition: 'all 0.3s',
  },
  emptyState: {
    padding: '40px',
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: '16px',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px',
    color: '#6b7280',
  },
  error: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '15px',
    borderRadius: '5px',
    marginBottom: '20px',
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
    zIndex: 1000,
  },
  modalContent: {
    background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
    borderRadius: '24px',
    maxWidth: '750px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 25px 80px rgba(0,0,0,0.25)',
    border: '2px solid rgba(168, 85, 247, 0.1)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '28px',
    borderBottom: '2px solid #e5e7eb',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    cursor: 'pointer',
    color: '#6b7280',
  },
  modalBody: {
    padding: '20px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#374151',
  },
  input: {
    width: '100%',
    padding: '14px 18px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    fontSize: '15px',
    boxSizing: 'border-box',
    backgroundColor: '#f9fafb',
    transition: 'all 0.2s',
  },
  permissionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    maxHeight: '300px',
    overflow: 'auto',
    padding: '15px',
    backgroundColor: '#f9fafb',
    borderRadius: '5px',
    border: '1px solid #e5e7eb',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  permissionName: {
    fontSize: '14px',
    color: '#374151',
    textTransform: 'capitalize',
  },
  modalActions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    marginTop: '20px',
  },
  submitButton: {
    padding: '14px 28px',
    background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '700',
    transition: 'all 0.3s',
    boxShadow: '0 4px 15px rgba(168, 85, 247, 0.4)',
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
    transition: 'all 0.3s',
  },
};

export default ManageEmployees;
