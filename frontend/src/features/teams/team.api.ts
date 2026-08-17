import httpClient from '../../services/http';

export interface Team { id: number; name: string; game: string; owner_user_id: number; }
export interface TeamInvitation { id: number; team_id: number; email: string; status: string; }

export const getMyTeams = async (): Promise<Team[]> => (await httpClient.get('/teams')).data as Team[];
export const createTeam = async (name: string, game: string): Promise<Team> => (await httpClient.post('/teams', { name, game })).data as Team;
export const inviteToTeam = async (teamId: number, email: string): Promise<TeamInvitation> => (await httpClient.post(`/teams/${teamId}/invitations`, { email })).data as TeamInvitation;
export const getTeamInvitations = async (): Promise<TeamInvitation[]> => (await httpClient.get('/teams/invitations')).data as TeamInvitation[];
export const acceptTeamInvitation = async (invitationId: number): Promise<Team> => (await httpClient.post(`/teams/invitations/${invitationId}/accept`)).data as Team;
export const registerTeamForTournament = async (tournamentId: number, teamId: number): Promise<{ success: boolean; message: string; registration_id: number }> =>
  (await httpClient.post(`/tournaments/${tournamentId}/join-team/${teamId}`)).data;
