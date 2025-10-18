export interface Ticket {
    id: number;
    title: string;
    description: string;
    status?: string;
    priority?: string;
    queue?: string;
    language?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface TicketResponse {
    tickets: Ticket[];
    total: number;
}