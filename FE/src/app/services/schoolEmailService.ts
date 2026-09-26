import api from './api';
import type { UserProfile } from './userService';

/** Step 1 — send an OTP to a school email whose domain belongs to a University. */
export async function requestSchoolEmail(email: string): Promise<void> {
  await api.post('/api/users/me/school-email/request', { email });
}

/** Step 2 — confirm the OTP; returns the updated profile (schoolVerified = true). */
export async function verifySchoolEmail(otp: string): Promise<UserProfile> {
  const { data } = await api.post('/api/users/me/school-email/verify', { otp });
  return data.data as UserProfile;
}
