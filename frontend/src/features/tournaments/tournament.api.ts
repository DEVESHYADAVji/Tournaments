import httpClient from '../../services/http';

// Tournament types
export interface Tournament {
	id: number;
	name: string;
	date: string;
	location?: string;
	description?: string;
	organizer?: string;
}

// Mock fallback data used when API isn't available
const mockTournaments: Tournament[] = [
	{ id: 1, name: 'Chess Championship', date: '2026-03-12', location: 'New York', description: 'A national-level chess tournament.', organizer: 'NY Chess Club' },
	{ id: 2, name: 'Coding Challenge', date: '2026-04-05', location: 'Online', description: 'Algorithm and speed coding contest.', organizer: 'Dev League' },
	{ id: 3, name: 'Gaming League', date: '2026-05-20', location: 'Los Angeles', description: 'Esports tournament with multiple games.', organizer: 'ProGamers' },
	{ id: 4, name: 'Table Tennis Cup', date: '2026-06-15', location: 'Chicago', description: 'Open table tennis competition.', organizer: 'Chicago Sports' },
];

/**
 * Get all tournaments
 * Attempts to call the API at GET /tournaments, normalizes common response shapes,
 * and falls back to mock data on error.
 */
export const getAllTournaments = async (): Promise<Tournament[]> => {
	try {
		const response = await httpClient.get('/tournaments');

		// Normalize response shapes: either array, or { data: [...] }, or { success, data }
		const respData: any = response.data;

		if (Array.isArray(respData)) {
			return respData as Tournament[];
		}

		if (respData && Array.isArray(respData.data)) {
			return respData.data as Tournament[];
		}

		// Unexpected shape -> return mock
		return mockTournaments;
	} catch (error) {
		console.error('getAllTournaments failed, returning mock data', error);
		return mockTournaments;
	}
};

/**
 * Get a single tournament by id
 * Attempts to call GET /tournaments/:id and falls back to mock data if necessary.
 */
export const getTournamentById = async (id: number | string): Promise<Tournament | null> => {
	const numericId = Number(id);
	try {
		const response = await httpClient.get(`/tournaments/${numericId}`);
		const respData: any = response.data;

		// Response might be the tournament object directly or { data: tournament }
		if (respData && respData.id) {
			return respData as Tournament;
		}

		if (respData && respData.data && respData.data.id) {
			return respData.data as Tournament;
		}

		// Not found shape
		return null;
	} catch (error) {
		console.error(`getTournamentById(${numericId}) failed, using mock fallback`, error);
		const found = mockTournaments.find((t) => t.id === numericId) || null;
		return found;
	}
};

export default {
	getAllTournaments,
	getTournamentById,
};

