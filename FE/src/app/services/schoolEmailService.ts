import api from './api';
import type { UserProfile } from './userService';

/** Step 1 — send an OTP to any email; universityCode is the university picked in the form. */
export async function requestSchoolEmail(email: string, universityCode?: string): Promise<void> {
  await api.post('/api/users/me/school-email/request', { email, universityCode: universityCode || undefined });
}

/** Step 2 — confirm the OTP; returns the updated profile (schoolVerified = true). */
export async function verifySchoolEmail(otp: string): Promise<UserProfile> {
  const { data } = await api.post('/api/users/me/school-email/verify', { otp });
  return data.data as UserProfile;
}
