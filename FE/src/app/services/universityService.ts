import api from './api';

export type UniversityStatus = 'WAITLIST' | 'LAUNCHING' | 'ACTIVE';

export interface UniversityResponse {
  id: string;
  code: string;
  name: string;
  shortName: string;
  logoUrl?: string;
  status: UniversityStatus;
  mentorCount: number;
}

export async function listUniversities(): Promise<UniversityResponse[]> {
  const { data } = await api.get('/api/universities');
  return data.data as UniversityResponse[];
}

export async function getUniversity(code: string): Promise<UniversityResponse> {
  const { data } = await api.get(`/api/universities/${code}`);
  return data.data as UniversityResponse;
}
