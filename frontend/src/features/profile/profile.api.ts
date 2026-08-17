import httpClient from '../../services/http';

export interface Profile {
  id: number;
  email: string;
  name: string;
  role: string;
  profile_icon?: number | null;
}

export const getProfile = async (): Promise<Profile> => (await httpClient.get('/profile')).data as Profile;
export const updateProfile = async (name: string, profileIcon: number): Promise<Profile> =>
  (await httpClient.patch('/profile', { name, profile_icon: profileIcon })).data as Profile;
