import { api, saveTokens } from './client';

export interface MobileUser {
  id: string;
  username: string;
  displayName: string;
  role: 'ADMIN' | 'DISPATCHER' | 'OFFICER' | 'VIEWER';
}

export async function login(username: string, password: string): Promise<MobileUser> {
  const data = await api.post<{ user: MobileUser; accessToken: string; refreshToken: string }>(
    '/auth/login',
    { username, password },
  );
  saveTokens(data.accessToken, data.refreshToken);
  return data.user;
}

export async function getMe(): Promise<MobileUser> {
  const data = await api.get<{ user: MobileUser }>('/me');
  return data.user;
}
