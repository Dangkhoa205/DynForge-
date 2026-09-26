import api from './api';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  roles: string[];
  studentId?: string;
  major?: string;
  year?: string;
  avatarUrl?: string;
  universityId?: string;
  universityName?: string;
  universityCode?: string;
  schoolVerified?: boolean;
  walletBalance: number;
  status: string;
  createdAt: string;
}

export interface UpdateProfilePayload {
  fullName: string;
  phone?: string;
  studentId?: string;
  major?: string;
  year?: string;
  avatarUrl?: string;
}

export async function getMe(): Promise<UserProfile> {
  const { data } = await api.get('/api/users/me');
  return data.data as UserProfile;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
  const { data } = await api.put('/api/users/me', payload);
  return data.data as UserProfile;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.post('/api/users/me/password', { currentPassword, newPassword });
}
