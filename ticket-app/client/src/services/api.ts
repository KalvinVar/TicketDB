import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

// Create axios instance with base configuration
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

export default api;

// Legacy functions for backward compatibility
const TICKETS_URL = `${API_BASE_URL}/tickets`;

export const fetchTickets = async () => {
    try {
        const response = await axios.get(TICKETS_URL);
        return response.data;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error('Error fetching tickets: ' + errorMessage);
    }
};

export const createTicket = async (ticketData: {
    title: string;
    description: string;
    status?: string;
    priority?: string;
}) => {
    try {
        const response = await axios.post(TICKETS_URL, ticketData);
        return response.data;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error('Error creating ticket: ' + errorMessage);
    }
};