import api from './api';

export type BookingStatus =
  | 'PENDING_PAYMENT'
  | 'ESCROW_HELD'
  | 'ACCEPTED'
  | 'TAUGHT'
  | 'COMPLETED'
  | 'DISPUTED'
  | 'REFUNDED'
  | 'CANCELLED';

export type BookingFormat = 'ONE_ON_ONE' | 'GROUP';

export interface BookingResponse {
  id: string;
  menteeId: string;
  mentorId: string;
  menteeName?: string;
  mentorName?: string;
  courseCode: string;
  format: BookingFormat;
  startAt: string;
  durationMin: number;
  price: number;
  commissionRate: number;
  status: BookingStatus;
  escrowTxnId?: string;
  createdAt: string;
  acceptedAt?: string;
  taughtAt?: string;
  disputeIssueType?: string;
  disputeReason?: string;
  disputeMentorResponse?: string;
  disputeMentorEvidenceUrl?: string;
  disputeRespondedAt?: string;
  rescheduledFrom?: string;
  pendingStartAt?: string;
  rescheduleCount?: number;
  roomId?: string;
  menteeEmail?: string;
  menteeAvatarUrl?: string;
}

export interface MentorEarningsResponse {
  availableBalance: number;
  pendingClearance: number;
  totalEarned: number;
  totalCommissionPaid: number;
  completedSessions: number;
  upcomingSessions: number;
}

export interface CreateBookingPayload {
  mentorId: string;
  courseCode: string;
  format: BookingFormat;
  startAt: string;
  durationMin: number;
}

export async function createBooking(payload: CreateBookingPayload): Promise<BookingResponse> {
  const { data } = await api.post('/api/bookings', payload);
  return data.data as BookingResponse;
}

export async function getMyBookings(): Promise<BookingResponse[]> {
  const { data } = await api.get('/api/bookings/mine');
  return data.data as BookingResponse[];
}

/** Mentor-only bookings, sorted by startAt ascending (upcoming first). */
export async function getMentorSchedule(): Promise<BookingResponse[]> {
  const { data } = await api.get('/api/bookings/mentor');
  return data.data as BookingResponse[];
}

export async function getMentorEarnings(): Promise<MentorEarningsResponse> {
  const { data } = await api.get('/api/bookings/earnings');
  return data.data as MentorEarningsResponse;
}

export async function acceptBooking(id: string): Promise<BookingResponse> {
  const { data } = await api.patch(`/api/bookings/${id}/accept`);
  return data.data as BookingResponse;
}

export async function declineBooking(id: string): Promise<BookingResponse> {
  const { data } = await api.patch(`/api/bookings/${id}/decline`);
  return data.data as BookingResponse;
}

export async function getBookingById(id: string): Promise<BookingResponse> {
  const { data } = await api.get(`/api/bookings/${id}`);
  return data.data as BookingResponse;
}

export async function payBooking(id: string): Promise<BookingResponse> {
  const { data } = await api.post(`/api/bookings/${id}/pay`);
  return data.data as BookingResponse;
}

export async function markTaught(id: string): Promise<BookingResponse> {
  const { data } = await api.patch(`/api/bookings/${id}/mark-taught`);
  return data.data as BookingResponse;
}

export async function confirmBooking(id: string): Promise<BookingResponse> {
  const { data } = await api.patch(`/api/bookings/${id}/confirm`);
  return data.data as BookingResponse;
}

export async function disputeBooking(id: string, issueType: string, reason: string): Promise<BookingResponse> {
  const { data } = await api.patch(`/api/bookings/${id}/dispute`, { issueType, reason });
  return data.data as BookingResponse;
}

export async function cancelBooking(id: string): Promise<BookingResponse> {
  const { data } = await api.patch(`/api/bookings/${id}/cancel`);
  return data.data as BookingResponse;
}

export async function respondDispute(
  id: string,
  payload: { response: string; evidenceUrl?: string }
): Promise<BookingResponse> {
  const { data } = await api.patch(`/api/bookings/${id}/dispute/respond`, payload);
  return data.data as BookingResponse;
}

export async function rescheduleBooking(
  id: string,
  newStartAt: string
): Promise<BookingResponse> {
  const { data } = await api.patch(`/api/bookings/${id}/reschedule`, { newStartAt });
  return data.data as BookingResponse;
}

export async function respondRescheduleBooking(
  id: string,
  accept: boolean,
  note?: string
): Promise<BookingResponse> {
  const { data } = await api.patch(`/api/bookings/${id}/reschedule/respond`, { accept, note });
  return data.data as BookingResponse;
}


export function mapStatusToDisplay(status: BookingStatus): string {
  const map: Record<BookingStatus, string> = {
    PENDING_PAYMENT: 'Pending Payment',
    ESCROW_HELD: 'In Escrow',
    ACCEPTED: 'Accepted',
    TAUGHT: 'Taught',
    COMPLETED: 'Completed',
    DISPUTED: 'Disputed',
    REFUNDED: 'Refunded',
    CANCELLED: 'Cancelled',
  };
  return map[status] ?? status;
}
