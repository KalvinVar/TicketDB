import axios from 'axios';

const API_URL = 'http://localhost:3001/api/tickets';

export const fetchTickets = async () => {
    try {
        const response = await axios.get(API_URL);
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
        const response = await axios.post(API_URL, ticketData);
        return response.data;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error('Error creating ticket: ' + errorMessage);
    }
};