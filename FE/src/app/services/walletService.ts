import api from './api';

export interface TransactionResponse {
  id: string;
  type: string;
  status: string;
  amount: number;
  description: string;
  relatedBookingId?: string;
  createdAt: string;
}

export interface WalletResponse {
  balance: number;
  transactions: TransactionResponse[];
}

export async function getWallet(): Promise<WalletResponse> {
  const { data } = await api.get('/api/wallet');
  return data.data as WalletResponse;
}

export async function topUp(amount: number): Promise<{ txnId: string; amount: number; paymentUrl: string; orderCode: number }> {
  const { data } = await api.post('/api/wallet/topup', { amount });
  return data.data;
}

/** Confirm a PayOS payment after the buyer is redirected back to the wallet. */
export async function confirmPayos(orderCode: string): Promise<TransactionResponse> {
  const { data } = await api.post('/api/wallet/payos-confirm', null, { params: { orderCode } });
  return data.data as TransactionResponse;
}

export async function withdraw(
  amount: number,
  bankName: string,
  bankAccount: string,
): Promise<TransactionResponse> {
  const { data } = await api.post('/api/wallet/withdraw', { amount, bankName, bankAccount });
  return data.data as TransactionResponse;
}
