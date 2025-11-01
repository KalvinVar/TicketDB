export interface Ticket {
    id: number;
    title: string;
    description: string;
    status?: string;
    priority?: string;
    queue?: string;
    language?: string;
    department_id?: number;
    department_name?: string;
    user_id?: number;
    assigned_to?: number;
    resolution_notes?: string;
    creator_name?: string;
    assignee_name?: string;
    createdAt?: string;
    updatedAt?: string;
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

export interface TicketResponse {
    tickets: Ticket[];
    total: number;
}