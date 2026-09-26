import api from './api';
import type { Mentor, MentorRole } from '../data/mockData';

export interface BackendCourse {
  code: string;
  name: string;
  grade: string;
  ratePrivate: number;
  rateGroup: number;
}

export interface MentorProfileResponse {
  id: string;
  userId: string;
  fullName: string;
  avatarUrl?: string;
  title?: string;
  bio?: string;
  major?: string;
  university?: string;
  universityId?: string;
  universityCode?: string;
  teachingRole?: string;
  courses: BackendCourse[];
  skills: string[];
  languages: string[];
  formats: string[];
  availability: Record<string, string[]>;
  verified: boolean;
  ratingAvg: number;
  ratingCount: number;
  sessionsCount: number;
}

export async function listMentors(course?: string): Promise<MentorProfileResponse[]> {
  const { data } = await api.get('/api/mentors', { params: course ? { course } : {} });
  return data.data as MentorProfileResponse[];
}

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface MentorSearchParams {
  university?: string;   // code slug (e.g. "FPTU-HCM") or ObjectId
  major?: string;
  course?: string;
  format?: string;
  verified?: boolean;
  page?: number;
  size?: number;
}

/** Database-side, paginated mentor search (see GET /api/mentors/search). */
export async function searchMentors(
  params: MentorSearchParams = {},
): Promise<PageResponse<MentorProfileResponse>> {
  const query: Record<string, string | number | boolean> = {};
  if (params.university) query.university = params.university;
  if (params.major) query.major = params.major;
  if (params.course) query.course = params.course;
  if (params.format) query.format = params.format;
  if (params.verified !== undefined) query.verified = params.verified;
  if (params.page !== undefined) query.page = params.page;
  if (params.size !== undefined) query.size = params.size;
  const { data } = await api.get('/api/mentors/search', { params: query });
  return data.data as PageResponse<MentorProfileResponse>;
}

export async function getMentorById(id: string): Promise<MentorProfileResponse> {
  const { data } = await api.get(`/api/mentors/${id}`);
  return data.data as MentorProfileResponse;
}

/** The logged-in mentor's own profile (requires MENTOR auth). */
export async function getMyMentorProfile(): Promise<MentorProfileResponse> {
  const { data } = await api.get('/api/mentors/me');
  return data.data as MentorProfileResponse;
}

export interface UpdateMentorProfilePayload {
  title?: string;
  bio?: string;
  major?: string;
  university?: string;
  teachingRole?: string;
  courses?: BackendCourse[];
  skills?: string[];
  languages?: string[];
  formats?: string[];
  availability?: Record<string, string[]>;
}

export async function updateMyMentorProfile(
  payload: UpdateMentorProfilePayload,
): Promise<MentorProfileResponse> {
  const { data } = await api.put('/api/mentors/me', payload);
  return data.data as MentorProfileResponse;
}

/** Returns true if s is a 24-character hex string (MongoDB ObjectId format). */
export function isObjectId(s: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(s);
}

// ── Mapping helpers ───────────────────────────────────────────────────────────

function titleToRole(title: string): MentorRole {
  const t = (title ?? '').toLowerCase();
  if (t.includes('lecturer') || t.includes('giảng viên')) return 'Lecturer';
  if (t.includes('alumni') || t.includes('cựu')) return 'Alumni Mentor';
  if (t.includes('research')) return 'Research Advisor';
  return 'Senior Student';
}

function nextAvailableDate(availability: Record<string, string[]>): string {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const availDays = new Set(Object.keys(availability));
  const base = new Date();
  for (let i = 1; i <= 7; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    if (availDays.has(dayNames[d.getDay()])) return d.toISOString().split('T')[0];
  }
  const tomorrow = new Date(base);
  tomorrow.setDate(base.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

/**
 * Maps a backend MentorProfileResponse to the Mentor shape used by MentorCard/MentorProfile.
 * Missing fields (university, level, etc.) are filled with sensible defaults.
 */
export function backendToMentor(p: MentorProfileResponse): Mentor {
  const courses = p.courses ?? [];
  const skills  = p.skills  ?? [];
  const hourlyRate = courses.length > 0 ? Math.min(...courses.map((c) => c.ratePrivate)) : 0;
  const groupRate  = courses.length > 0 ? Math.min(...courses.map((c) => c.rateGroup))   : 0;
  return {
    id: p.id,
    name: p.fullName,
    avatar: p.avatarUrl ?? '',
    role: (p.teachingRole?.trim() ? (p.teachingRole as MentorRole) : titleToRole(p.title ?? '')),
    verified: p.verified,
    university: p.university?.trim() ? p.university : 'FPT University HCM',
    major: p.major ?? '',
    headline: (p.bio ?? '').split('.')[0] + '.',
    about: p.bio ?? '',
    rating: p.ratingAvg,
    reviewsCount: p.ratingCount,
    sessionsCompleted: p.sessionsCount,
    hourlyRate,
    groupRate,
    responseTime: 'Under 1 hour',
    formats: p.formats?.length ? p.formats : ['Online', 'Offline'],
    languages: p.languages ?? [],
    level: 'Undergraduate',
    expertise: skills,
    courses: courses.map((c) => ({
      code: c.code,
      name: c.name,
      ratePrivate: c.ratePrivate,
      rateGroup: c.rateGroup,
    })),
    strengths: skills,
    nextAvailable: nextAvailableDate(p.availability ?? {}),
  };
}
