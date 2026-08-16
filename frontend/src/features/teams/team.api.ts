import httpClient from '../../services/http';

export interface Team {
  id: number;
  name: string;
  game: string;
  owner_user_id: number;
}

export interface TeamInvitation {
  id: number;
  team_id: number;
  email: string;
  status: string;
}

export const getMyTeams = async (): Promise<Team[]> => {
  const response = await httpClient.get('/teams');
  return response.data as Team[];
};

export const createTeam = async (name: string, game: string): Promise<Team> => {
  const response = await httpClient.post('/teams', { name, game });
  return response.data as Team;
};

export const inviteToTeam = async (teamId: number, email: string): Promise<TeamInvitation> => {
  const response = await httpClient.post(`/teams/${teamId}/invitations`, { email });
  return response.data as TeamInvitation;
};

export const getTeamInvitations = async (): Promise<TeamInvitation[]> => {
  const response = await httpClient.get('/teams/invitations');
  return response.data as TeamInvitation[];
};

export const acceptTeamInvitation = async (invitationId: number): Promise<Team> => {
  const response = await httpClient.post(`/teams/invitations/${invitationId}/accept`);
  return response.data as Team;
};
