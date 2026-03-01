import httpClient from '../../services/http';

export interface Tournament {
  id: number;
  name: string;
  game: string;
  format: string;
  status: 'registration_open' | 'upcoming' | 'live' | 'completed' | string;
  location?: string | null;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  prize_pool: number;
  max_teams: number;
  participants_count: number;
  matches_count: number;
  is_registered: boolean;
  created_at?: string;
}

export interface TournamentCreateInput {
  name: string;
  game: string;
  format: string;
  status: 'registration_open' | 'upcoming' | 'live' | 'completed';
  location?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  prize_pool: number;
  max_teams: number;
}

export interface Registration {
  id: number;
  tournament_id: number;
  user_id: number;
  team_name: string;
  status: string;
  points: number;
  created_at: string;
}

export interface Match {
  id: number;
  tournament_id: number;
  round_name: string;
  team_a: string;
  team_b: string;
  scheduled_at?: string | null;
  team_a_score?: number | null;
  team_b_score?: number | null;
  winner?: string | null;
  status: string;
  created_at: string;
}

export interface MatchCreateInput {
  round_name: string;
  team_a: string;
  team_b: string;
  scheduled_at?: string;
}

export interface MatchResultInput {
  team_a_score: number;
  team_b_score: number;
  winner?: string;
}

export interface StandingRow {
  rank: number;
  user_id: number;
  team_name: string;
  points: number;
  status: string;
}

export interface Announcement {
  id: number;
  tournament_id: number;
  title: string;
  content: string;
  created_at: string;
}

export interface AnnouncementCreateInput {
  title: string;
  content: string;
}

export interface MyRegistration {
  registration_id: number;
  tournament_id: number;
  tournament_name: string;
  game: string;
  status: string;
  team_name: string;
  points: number;
  start_date?: string | null;
}

const fallbackTournaments: Tournament[] = [
  {
    id: 1,
    name: 'Valor Clash Invitational',
    game: 'Valorant',
    format: 'Double Elimination',
    status: 'registration_open',
    location: 'Online',
    description: 'Regional invitational with live streams and playoffs.',
    start_date: '2026-03-12T18:00:00Z',
    end_date: '2026-03-15T20:00:00Z',
    prize_pool: 25000,
    max_teams: 16,
    participants_count: 0,
    matches_count: 0,
    is_registered: false,
  },
];

export const getAllTournaments = async (): Promise<Tournament[]> => {
  try {
    const response = await httpClient.get('/tournaments');
    if (Array.isArray(response.data)) {
      return response.data as Tournament[];
    }
    return fallbackTournaments;
  } catch (error) {
    console.error('getAllTournaments failed, returning fallback data', error);
    return fallbackTournaments;
  }
};

export const getTournamentById = async (id: number | string): Promise<Tournament | null> => {
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return null;
  }
  try {
    const response = await httpClient.get(`/tournaments/${numericId}`);
    return response.data as Tournament;
  } catch (error) {
    console.error(`getTournamentById(${numericId}) failed`, error);
    return null;
  }
};

export const createTournament = async (payload: TournamentCreateInput): Promise<Tournament> => {
  const response = await httpClient.post('/tournaments', payload);
  return response.data as Tournament;
};

export const joinTournament = async (
  tournamentId: number | string,
  teamName?: string
): Promise<{ success: boolean; message: string; registration: Registration }> => {
  const response = await httpClient.post(`/tournaments/${Number(tournamentId)}/join`, {
    team_name: teamName || undefined,
  });
  return response.data;
};

export const getTournamentParticipants = async (tournamentId: number | string): Promise<Registration[]> => {
  const response = await httpClient.get(`/tournaments/${Number(tournamentId)}/participants`);
  return response.data as Registration[];
};

export const getTournamentMatches = async (tournamentId: number | string): Promise<Match[]> => {
  const response = await httpClient.get(`/tournaments/${Number(tournamentId)}/matches`);
  return response.data as Match[];
};

export const createTournamentMatch = async (
  tournamentId: number | string,
  payload: MatchCreateInput
): Promise<Match> => {
  const response = await httpClient.post(`/tournaments/${Number(tournamentId)}/matches`, payload);
  return response.data as Match;
};

export const updateMatchResult = async (
  tournamentId: number | string,
  matchId: number | string,
  payload: MatchResultInput
): Promise<Match> => {
  const response = await httpClient.patch(
    `/tournaments/${Number(tournamentId)}/matches/${Number(matchId)}/result`,
    payload
  );
  return response.data as Match;
};

export const getTournamentStandings = async (tournamentId: number | string): Promise<StandingRow[]> => {
  const response = await httpClient.get(`/tournaments/${Number(tournamentId)}/standings`);
  return response.data as StandingRow[];
};

export const getTournamentAnnouncements = async (tournamentId: number | string): Promise<Announcement[]> => {
  const response = await httpClient.get(`/tournaments/${Number(tournamentId)}/announcements`);
  return response.data as Announcement[];
};

export const createTournamentAnnouncement = async (
  tournamentId: number | string,
  payload: AnnouncementCreateInput
): Promise<Announcement> => {
  const response = await httpClient.post(`/tournaments/${Number(tournamentId)}/announcements`, payload);
  return response.data as Announcement;
};

export const getMyRegistrations = async (): Promise<MyRegistration[]> => {
  const response = await httpClient.get('/tournaments/me/registrations');
  return response.data as MyRegistration[];
};
