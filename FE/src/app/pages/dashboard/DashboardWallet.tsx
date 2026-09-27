import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import {
  Wallet, ShieldCheck, TrendingDown, RefreshCcw, Plus, Receipt,
  CheckCircle2, Smartphone, Building2, ChevronRight, Loader2,
} from 'lucide-react';
import { formatCurrency } from '../../data/mockData';
import { getWallet, topUp, confirmPayos, type TransactionResponse } from '../../services/walletService';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../../components/ui/dialog';
import { KpiCard } from '../../components/cards';
import { GsapCounter } from '../../components/GsapCounter';
import { StatusBadge } from '../../components/common';
import { cn } from '../../components/ui/utils';
import { toast } from 'sonner';
import { useLanguage } from '../../context/LanguageContext';
import { isNativeApp } from '../../lib/platform';

// ── Add Funds modal (PayOS) ──────────────
function AddFundsModal({ onClose }: { onClose: () => void }) {
  const [amount, setAmount] = useState('200000');
  const [loading, setLoading] = useState(false);
  const num = parseInt(amount.replace(/\D/g, '')) || 0;

  const pay = async () => {
    if (num < 10000) { toast.error('Minimum top-up is 10,000₫'); return; }
    setLoading(true);
    try {
      const { paymentUrl } = await topUp(num);
      window.location.href = paymentUrl;
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Could not start payment. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader><DialogTitle>Add Funds to Wallet</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block">Amount to top up (₫)</Label>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
              className="bg-input-background text-lg"
              style={{ fontWeight: 600 }}
              autoFocus
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {['50000', '100000', '200000', '500000'].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(v)}
                  className={cn('rounded-lg border px-3 py-1 text-sm transition-colors', amount === v ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent')}
                >
                  {formatCurrency(Number(v))}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Minimum: 10.000₫</p>
          </div>

          <div className="rounded-xl border border-border p-4">
            <p className="mb-2 text-sm text-muted-foreground">Payment method</p>
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Building2 className="size-5" /></span>
              <div>
                <p style={{ fontWeight: 600 }}>PayOS</p>
                <p className="text-sm text-muted-foreground">Bank transfer · VietQR · e-wallet</p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-success/10 p-3 text-sm text-success">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            You'll be redirected to PayOS to pay securely. Your balance updates automatically when you return.
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button className="flex-1" onClick={pay} disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : `Pay ${formatCurrency(num)}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Withdraw modal ─────────────────────────────────────────────
function WithdrawModal({ onClose, balance }: { onClose: () => void; balance: number }) {
  const [method, setMethod] = useState<'momo' | 'bank' | null>(null);
  const [amount, setAmount] = useState('100000');

  const confirm = () => {
    toast.success(`Withdrawal of ${formatCurrency(Number(amount))} requested. Processing within 1–3 business days.`);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Withdraw from Wallet</DialogTitle>
        </DialogHeader>

        {!method ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Select a withdrawal method:</p>
            <button onClick={() => setMethod('momo')} className="flex w-full items-center justify-between rounded-xl border border-border p-4 transition-colors hover:border-primary/50 hover:bg-accent">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-[#d82d8b]/10"><Smartphone className="size-5 text-[#d82d8b]" /></span>
                <div className="text-left">
                  <p style={{ fontWeight: 600 }}>MoMo</p>
                  <p className="text-sm text-muted-foreground">Withdraw to MoMo — instant</p>
                </div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
            <button onClick={() => setMethod('bank')} className="flex w-full items-center justify-between rounded-xl border border-border p-4 transition-colors hover:border-primary/50 hover:bg-accent">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10"><Building2 className="size-5 text-primary" /></span>
                <div className="text-left">
                  <p style={{ fontWeight: 600 }}>Tài khoản ngân hàng</p>
                  <p className="text-sm text-muted-foreground">1–3 ngày làm việc</p>
                </div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <button onClick={() => setMethod(null)} className="flex items-center gap-1 text-sm text-primary hover:underline">← Change method</button>
            <div>
              <Label className="mb-1.5 block">Amount to withdraw (₫)</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} className="bg-input-background text-lg" style={{ fontWeight: 600 }} />
              <p className="mt-1 text-sm text-muted-foreground">Available balance: <strong>{formatCurrency(balance)}</strong> · Minimum: 50.000₫</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {['50000', '100000', '200000', '500000'].map((v) => (
                  <button key={v} onClick={() => setAmount(v)} className={cn('rounded-lg border px-3 py-1 text-sm transition-colors', amount === v ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent')}>
                    {formatCurrency(Number(v))}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-pale-blue/50 p-4">
              {method === 'momo'
                ? <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-[#d82d8b]/10"><Smartphone className="size-5 text-[#d82d8b]" /></span><div><p className="text-sm text-muted-foreground">Rút về MoMo</p><p style={{ fontWeight: 600 }}>0912 345 678 — Nguyễn Văn A</p><p className="text-xs text-success">✓ Verified</p></div></div>
                : <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10"><Building2 className="size-5 text-primary" /></span><div><p className="text-sm text-muted-foreground">Vietcombank</p><p style={{ fontWeight: 600 }}>···· ···· 6789 — Nguyễn Văn A</p><p className="text-xs text-success">✓ Verified</p></div></div>
              }
            </div>
            <div className="flex items-start gap-2 rounded-xl bg-success/10 p-3 text-sm text-success">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" />
              Funds will be sent to your account after successful processing.
            </div>
            <Button className="w-full" size="lg" onClick={confirm}>Confirm withdrawal</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main wallet page ───────────────────────────────────────────
export function DashboardWallet() {
  const { T } = useLanguage();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState('All');
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchWallet = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await getWallet();
      setBalance(data.balance);
      setTransactions(data.transactions ?? []);
    } catch {
      // keep defaults
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchWallet(); }, [fetchWallet]);

  // Handle the PayOS return redirect (?orderCode=...&status=...) — confirm & credit once.
  useEffect(() => {
    const orderCode = searchParams.get('orderCode');
    if (!orderCode || !user?.id) return;
    const status = searchParams.get('status');
    const cancelled = searchParams.get('cancel') === 'true' || status === 'CANCELLED';

    // Clear PayOS params from the URL so a refresh doesn't re-trigger.
    setSearchParams({}, { replace: true });

    if (cancelled) {
      toast.info('Payment was cancelled.');
      return;
    }
    confirmPayos(orderCode)
      .then((txn) => {
        if (txn.status === 'COMPLETED') {
          toast.success(`Top-up of ${formatCurrency(txn.amount)} successful!`);
          fetchWallet();
        } else if (txn.status === 'FAILED') {
          toast.error('Payment failed or was cancelled.');
        } else {
          toast.info('Payment is still processing. Your balance will update shortly.');
        }
      })
      .catch((err: any) => toast.error(err?.response?.data?.message ?? 'Could not confirm payment.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // compute summary stats
  const escrowHeld = transactions.filter((t) => t.type === 'PAYMENT' && t.status === 'COMPLETED').reduce((s, t) => s + t.amount, 0);
  const totalSpent = transactions.filter((t) => t.type === 'PAYMENT').reduce((s, t) => s + t.amount, 0);
  const totalRefunded = transactions.filter((t) => t.type === 'REFUND').reduce((s, t) => s + t.amount, 0);

  const filtered = tab === 'All' ? transactions : transactions.filter((t) => t.type === tab.toUpperCase() || t.status === tab.toUpperCase());

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-6">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{T.walletTitle}</h1>
        <p className="mt-1 text-muted-foreground">{T.walletSubtitle}</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={T.availableBalance} value={formatCurrency(balance)} icon={Wallet} />
        <KpiCard label={T.heldInEscrowLabel} value={formatCurrency(escrowHeld)} icon={ShieldCheck} tone="warning" />
        <KpiCard label={T.totalSpentLabel} value={formatCurrency(totalSpent)} icon={TrendingDown} />
        <KpiCard label={T.refunded} value={formatCurrency(totalRefunded)} icon={RefreshCcw} tone="success" />
      </div>

      <Card className="mb-6 border-border p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Available balance</p>
            {loading
              ? <div className="mt-1 flex items-center gap-2 text-muted-foreground"><Loader2 className="size-5 animate-spin" /> Loading…</div>
              : <p className="mt-1 text-navy" style={{ fontSize: '2.25rem', fontWeight: 800 }}>
                  <GsapCounter targetValue={balance} suffix="₫" />
                </p>
            }
          </div>
          <div className="flex gap-3">
            {/* Android app: no stored-value top-ups (Google Play payments policy) — sessions are paid one by one. */}
            {!isNativeApp() && (
              <Button onClick={() => setShowAddFunds(true)}>
                <Plus className="size-4" /> {T.addFunds}
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowWithdraw(true)}>
              {T.withdraw}
            </Button>
          </div>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-success/10 p-3 text-sm text-success">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          Payments are protected by escrow — funds are released to your mentor only after session confirmation.
        </div>
      </Card>

      {/* Transaction history */}
      <Card className="border-border p-6">
        <h2 className="mb-4" style={{ fontSize: '1.125rem', fontWeight: 600 }}>{T.transactionHistory}</h2>
        <Tabs value={tab} onValueChange={setTab} className="mb-4">
          <TabsList className="flex-wrap">
            {[
              { key: 'All', label: T.all },
              { key: 'PAYMENT', label: 'Payments' },
              { key: 'TOPUP', label: 'Top-ups' },
              { key: 'REFUND', label: T.refunded },
              { key: 'PAYOUT', label: 'Payouts' },
            ].map((t) => <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>)}
          </TabsList>
        </Tabs>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
            <Loader2 className="size-5 animate-spin" /> Loading transactions…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No transactions yet.</TableCell>
                  </TableRow>
                ) : filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell><StatusBadge status={t.type} /></TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">{t.description}</TableCell>
                    <TableCell style={{ fontWeight: 600 }}>{formatCurrency(t.amount)}</TableCell>
                    <TableCell><StatusBadge status={t.status} /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-primary">
                        <Receipt className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {showAddFunds && !isNativeApp() && <AddFundsModal onClose={() => setShowAddFunds(false)} />}
      {showWithdraw && <WithdrawModal onClose={() => setShowWithdraw(false)} balance={balance} />}
    </div>
  );
}
