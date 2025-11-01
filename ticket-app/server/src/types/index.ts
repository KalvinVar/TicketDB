export interface Ticket {
  id: number;
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  queue?: string;
  language?: string;
  user_id?: number;
  assigned_to?: number;
  department_id?: number;
  department_name?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  closed_by?: number;
  creator_name?: string;
  assignee_name?: string;
}

export interface TicketNote {
  id: number;
  ticket_id: number;
  employee_id: number;
  employee_name?: string;
  note_text: string;
  is_internal: boolean;
  created_at: string;
}

export interface TicketAssignment {
  id: number;
  ticket_id: number;
  created_by_user_id?: number;
  created_by_employee_id?: number;
  assigned_to_employee_id?: number;
  assigned_at: string;
  assigned_by_employee_id?: number;
}

export interface TicketRequest {
  title: string;
  description: string;
  type?: string;
  priority?: string;
  department_id?: number;
  user_id?: number;
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  company?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  department_id: number;
  department_name?: string;
  role: 'admin' | 'manager' | 'agent' | 'viewer';
  permissions: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: number;
  name: string;
  description?: string;
  resource: string;
  action: string;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  permissions: string[];
  created_at: string;
}