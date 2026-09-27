import api from './api';
import { confirmPayos, type TransactionResponse } from './walletService';

/**
 * Per-session PayOS checkout (Android app). The app does not sell wallet top-ups: each 1:1 session
 * is paid for individually, then the backend moves the money straight into that booking's escrow.
 */
export interface CheckoutResponse {
  txnId: string;
  amount: number;
  paymentUrl: string;
  orderCode: number;
}

export async function createBookingCheckout(bookingId: string, fromApp: boolean): Promise<CheckoutResponse> {
  const { data } = await api.post(`/api/bookings/${bookingId}/checkout`, null, { params: { app: fromApp } });
  return data.data as CheckoutResponse;
}

/** What the order screen needs to show the escrow page once the payment is confirmed. */
export interface PendingPayment {
  orderCode: number;
  bookingId: string;
  mentor: string;
  amount: number;
  day?: number;
  month?: number;
  year?: number;
  slot?: string;
  duration?: number;
}

const PENDING_KEY = 'dynforge_pending_payment';

export function savePendingPayment(p: PendingPayment): void {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(p)); } catch { /* storage unavailable */ }
}

export function loadPendingPayment(): PendingPayment | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingPayment) : null;
  } catch {
    return null;
  }
}

export function clearPendingPayment(): void {
  try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
}

/**
 * Asks the backend to check the order with PayOS until it is paid or failed.
 * Resolves with the final transaction, or null if it is still pending when time runs out / aborted.
 */
export async function waitForPayment(
  orderCode: number | string,
  opts: { intervalMs?: number; timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<TransactionResponse | null> {
  const interval = opts.intervalMs ?? 3000;
  const deadline = Date.now() + (opts.timeoutMs ?? 10 * 60 * 1000);
  while (Date.now() < deadline) {
    if (opts.signal?.aborted) return null;
    try {
      const txn = await confirmPayos(String(orderCode));
      if (txn.status === 'COMPLETED' || txn.status === 'FAILED') return txn;
    } catch {
      // network blip or PayOS not reachable yet — keep trying
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  return null;
}
