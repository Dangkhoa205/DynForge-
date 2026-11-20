import api from './api';

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface VerificationItem {
  id: string;
  userId: string;
  userName?: string;
  avatarUrl?: string;
  course: string;
  claimedGrade: string;
  transcriptUrl?: string;
  alumniProofUrl?: string;
  status: VerificationStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  note?: string;
  createdAt: string;
  /** Every uploaded document: "category|doc:<fileId>:<fileName>" (transcript, certificate, portfolio, id). */
  documents?: string[];
}

export interface SubmitVerificationPayload {
  course: string;
  claimedGrade: 'A' | 'A+';
  transcriptUrl?: string;
  alumniProofUrl?: string;
  documents?: string[];
}

export async function submitVerification(payload: SubmitVerificationPayload): Promise<VerificationItem> {
  const { data } = await api.post('/api/verifications', payload);
  return data.data as VerificationItem;
}

export async function listMyVerifications(): Promise<VerificationItem[]> {
  const { data } = await api.get('/api/verifications/mine');
  return data.data as VerificationItem[];
}

export async function listVerifications(status?: VerificationStatus): Promise<VerificationItem[]> {
  const { data } = await api.get('/api/verifications', {
    params: status ? { status } : {},
  });
  return data.data as VerificationItem[];
}

export async function decideVerification(
  id: string,
  status: 'APPROVED' | 'REJECTED',
  note?: string
): Promise<VerificationItem> {
  const { data } = await api.post(`/api/verifications/${id}/decision`, { status, note });
  return data.data as VerificationItem;
}

/** Reference saved in transcriptUrl / alumniProofUrl for an uploaded file: "doc:<fileId>:<fileName>". */
export const DOC_REF_PREFIX = 'doc:';

export interface UploadedDocument {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
  ref: string;
}

/** Uploads one verification document (PDF or image, max 10 MB) and returns its reference. */
export async function uploadVerificationDocument(file: File): Promise<UploadedDocument> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post('/api/verifications/documents', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data as UploadedDocument;
}

export function parseDocRef(value?: string): { id: string; fileName: string } | null {
  if (!value || !value.startsWith(DOC_REF_PREFIX)) return null;
  const rest = value.slice(DOC_REF_PREFIX.length);
  const i = rest.indexOf(':');
  return i < 0 ? { id: rest, fileName: rest } : { id: rest.slice(0, i), fileName: rest.slice(i + 1) };
}

/**
 * Opens an uploaded document in a new tab. The file endpoint needs the login token, so the file is
 * downloaded with it first and shown from a temporary blob URL.
 */
export async function openVerificationDocument(id: string): Promise<void> {
  const win = window.open('', '_blank'); // open synchronously so the popup is not blocked
  try {
    const res = await api.get(`/api/verifications/documents/${id}`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data as Blob);
    if (win) win.location.href = url; else window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    win?.close();
    throw err;
  }
}
