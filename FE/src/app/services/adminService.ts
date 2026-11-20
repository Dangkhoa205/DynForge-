import api from './api';
import type { UserProfile } from './userService';
import type { MentorProfileResponse } from './mentorService';
import type { BookingResponse } from './bookingService';

export interface AdminDashboard {
  totalUsers: number;
  totalMentors: number;
  totalMentees: number;
  totalBookings: number;
  completedBookings: number;
  activeBookings: number;
  disputedBookings: number;
  pendingVerifications: number;
  totalRevenue: number;
  totalCommission: number;
  escrowHeld: number;
}

export interface AdminTransaction {
  id: string;
  userId: string;
  userName?: string;
  type: string;
  status: string;
  amount: number;
  description?: string;
  relatedBookingId?: string;
  createdAt: string;
}

export interface CommissionReport {
  commissionRate: number;
  totalCommissionEarned: number;
  pendingCommission: number;
  grossVolume: number;
  releasedCount: number;
  heldCount: number;
}

export interface AdminDispute {
  bookingId: string;
  menteeId: string;
  menteeName?: string;
  mentorId: string;
  mentorName?: string;
  courseCode: string;
  price: number;
  status: string;
  issueType?: string;
  reason?: string;
  startAt: string;
  createdAt: string;
  mentorResponse?: string;
  mentorEvidenceUrl?: string;
  mentorRespondedAt?: string;
}

export interface AdminMenteeDetail {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  studentId?: string;
  major?: string;
  universityName?: string;
  universityCode?: string;
  year?: string;
  avatarUrl?: string;
  schoolEmail?: string;
  schoolVerified: boolean;
  status: string;
  joinedAt?: string;
  totalSessionsWithMentor: number;
}

export interface AdminMentorBookingItem {
  id: string;
  courseCode: string;
  format: 'ONE_ON_ONE' | 'GROUP';
  startAt: string;
  durationMin: number;
  price: number;
  commissionRate: number;
  status: string;
  createdAt: string;
  acceptedAt?: string;
  taughtAt?: string;
  roomId?: string;
  disputeIssueType?: string;
  disputeReason?: string;
  mentee?: AdminMenteeDetail;
}

export interface AdminMentorScheduleOverview {
  mentorUserId: string;
  mentorName: string;
  mentorAvatarUrl?: string;
  mentorRole: string;
  university?: string;
  major?: string;
  totalSessions: number;
  uniqueMenteesCount: number;
  totalRevenue: number;
  upcomingCount: number;
  completedCount: number;
  cancelledCount: number;
  sessions: AdminMentorBookingItem[];
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const { data } = await api.get('/api/admin/dashboard');
  return data.data as AdminDashboard;
}

export async function listAdminUsers(role?: string): Promise<UserProfile[]> {
  const { data } = await api.get('/api/admin/users', { params: role ? { role } : {} });
  return data.data as UserProfile[];
}

export async function updateUserStatus(id: string, status: 'ACTIVE' | 'SUSPENDED'): Promise<UserProfile> {
  const { data } = await api.patch(`/api/admin/users/${id}/status`, { status });
  return data.data as UserProfile;
}

export async function listAdminTransactions(type?: string): Promise<AdminTransaction[]> {
  const { data } = await api.get('/api/admin/transactions', { params: type ? { type } : {} });
  return data.data as AdminTransaction[];
}

export async function getCommissionReport(): Promise<CommissionReport> {
  const { data } = await api.get('/api/admin/commission');
  return data.data as CommissionReport;
}

export async function listAdminDisputes(): Promise<AdminDispute[]> {
  const { data } = await api.get('/api/admin/disputes');
  return data.data as AdminDispute[];
}

export async function listAdminMentors(): Promise<MentorProfileResponse[]> {
  const { data } = await api.get('/api/admin/mentors');
  return data.data as MentorProfileResponse[];
}

export async function resolveDispute(bookingId: string, releaseToMentor: boolean) {
  const { data } = await api.patch(`/api/bookings/${bookingId}/resolve`, { releaseToMentor });
  return data.data;
}

export async function getAdminMentorBookings(mentorUserId: string): Promise<BookingResponse[]> {
  const { data } = await api.get(`/api/admin/mentors/${mentorUserId}/bookings`);
  return data.data as BookingResponse[];
}

export async function getAdminMentorScheduleOverview(mentorUserId: string): Promise<AdminMentorScheduleOverview> {
  const { data } = await api.get(`/api/admin/mentors/${mentorUserId}/schedule-overview`);
  return data.data as AdminMentorScheduleOverview;
}

export async function toggleAdminMentorCourseVerification(
  mentorUserId: string,
  courseCode: string,
  verified: boolean
): Promise<MentorProfileResponse> {
  const { data } = await api.patch(
    `/api/admin/mentors/${mentorUserId}/courses/${encodeURIComponent(courseCode)}/verify`,
    null,
    { params: { verified } }
  );
  return data.data as MentorProfileResponse;
}

// ── Insights (user demographics + feedback) ─────────────────────────────────
export interface InsightBucket { label: string; count: number }

export interface Demographics {
  totalUsers: number;
  mentees: number;
  mentors: number;
  ageGroups: InsightBucket[];
  majors: InsightBucket[];
  universities: InsightBucket[];
  provinces: InsightBucket[];
  profilesWithAge: number;
  profilesWithProvince: number;
}

export interface FeedbackReview {
  id: string;
  createdAt: string;
  rating: number;
  comment?: string;
  courseCode?: string;
  bookingId?: string;
  menteeId?: string;
  menteeName?: string;
  mentorId?: string;
  mentorName?: string;
}

export interface MentorRating { mentorId: string; mentorName?: string; averageRating: number; reviewCount: number }

export interface FeedbackReport {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: InsightBucket[];
  mentorRatings: MentorRating[];
  reviews: FeedbackReview[];
}

export async function getDemographics(role?: 'MENTEE' | 'MENTOR'): Promise<Demographics> {
  const { data } = await api.get('/api/admin/insights/demographics', { params: role ? { role } : {} });
  return data.data as Demographics;
}

export async function getFeedbackReport(): Promise<FeedbackReport> {
  const { data } = await api.get('/api/admin/insights/feedback');
  return data.data as FeedbackReport;
}
