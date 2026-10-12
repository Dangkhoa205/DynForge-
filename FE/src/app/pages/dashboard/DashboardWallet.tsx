import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import {
  Wallet, ShieldCheck, TrendingDown, RefreshCcw, Plus, Receipt,
  CheckCircle2, Smartphone, Building2, ChevronRight, Loader2,
  CreditCard, ArrowUpRight, ArrowDownLeft, Lock, Sparkles,
  ExternalLink, Info, Check, AlertCircle
} from 'lucide-react';
import { formatCurrency } from '../../data/mockData';
import { getWallet, topUp, confirmPayos, type TransactionResponse } from '../../services/walletService';
import { useAuth } from '../../context/AuthContext';
import { getMe, type UserProfile } from '../../services/userService';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../../components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import { GsapCounter } from '../../components/GsapCounter';
import { StatusBadge } from '../../components/common';
import { cn } from '../../components/ui/utils';
import { toast } from 'sonner';
import { useLanguage } from '../../context/LanguageContext';
import { formatDate } from '../../lib/format';
import { isNativeApp } from '../../lib/platform';

// ── Add Funds modal (PayOS) ──────────────
function AddFundsModal({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const [amount, setAmount] = useState('200000');
  const [loading, setLoading] = useState(false);
  const num = parseInt(amount.replace(/\D/g, '')) || 0;

  const pay = async () => {
    if (num < 10000) { toast.error('Số tiền nạp tối thiểu là 10.000₫'); return; }
    setLoading(true);
    try {
      const { paymentUrl } = await topUp(num);
      window.location.href = paymentUrl;
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Không thể khởi tạo cổng thanh toán PayOS.');
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-slate-950 border border-slate-800 text-slate-100 backdrop-blur-2xl shadow-2xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-white">
            <CreditCard className="size-5 text-cyan-400" />
            Nạp tiền vào Ví Ký Quỹ DynForge
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-slate-300">Nhập số tiền cần nạp (₫)</Label>
            <div className="relative">
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                className="bg-slate-900 border-slate-800 text-xl font-bold text-emerald-400 pl-4 pr-12 rounded-2xl h-12"
                autoFocus
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">VNĐ</span>
            </div>

            {/* Quick preset chips */}
            <div className="mt-3 flex flex-wrap gap-2">
              {['50000', '100000', '200000', '500000', '1000000'].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(v)}
                  className={cn(
                    'rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all',
                    amount === v
                      ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300 shadow'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
                  )}
                >
                  {formatCurrency(Number(v))}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Tối thiểu: 10.000₫ · Không mất phí nạp tiền</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="mb-2 text-xs font-semibold text-slate-400">Cổng thanh toán chính thức</p>
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Building2 className="size-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-white flex items-center gap-1.5">
                  PayOS VietQR & Thẻ Ngân Hàng
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full font-normal">Tự động 24/7</span>
                </p>
                <p className="text-xs text-slate-400">Quét mã VietQR chuyển khoản liên ngân hàng miễn phí</p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-3.5 text-xs text-emerald-300 leading-relaxed">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-400" />
            <div>
              <p className="font-semibold text-emerald-200">Bảo vệ Escrow 100%</p>
              <p className="mt-0.5 text-emerald-300/80">
                Bạn sẽ được chuyển sang giao diện thanh toán an toàn của PayOS. Sau khi quét mã QR thành công, số dư ví sẽ được cập nhật tức thì.
              </p>
            </div>
          </div>

          <div className="flex gap-2.5 pt-2">
            <Button variant="outline" className="flex-1 rounded-2xl border-slate-800 hover:bg-slate-900 text-slate-300" onClick={onClose} disabled={loading}>
              Hủy
            </Button>
            <Button
              className="flex-1 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-500/25"
              onClick={pay}
              disabled={loading}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : `Nạp ${formatCurrency(num)}`}
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
    toast.success(`Yêu cầu rút ${formatCurrency(Number(amount))} đã được tiếp nhận. Tiền sẽ về tài khoản trong 1–3 ngày làm việc.`);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-slate-950 border border-slate-800 text-slate-100 backdrop-blur-2xl shadow-2xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white">Rút tiền từ ví về tài khoản</DialogTitle>
        </DialogHeader>

        {!method ? (
          <div className="space-y-3 pt-2">
            <p className="text-xs text-slate-400">Chọn phương thức rút tiền về:</p>
            <button
              onClick={() => setMethod('momo')}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition-all hover:border-cyan-500/40 hover:bg-slate-900 text-left"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-[#d82d8b]/15 text-[#d82d8b]">
                  <Smartphone className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-white">Ví MoMo</p>
                  <p className="text-xs text-slate-400">Xử lý ngay tức thì</p>
                </div>
              </div>
              <ChevronRight className="size-4 text-slate-400" />
            </button>
            <button
              onClick={() => setMethod('bank')}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition-all hover:border-cyan-500/40 hover:bg-slate-900 text-left"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">
                  <Building2 className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-white">Tài khoản Ngân hàng (Napas 24/7)</p>
                  <p className="text-xs text-slate-400">Chuyển khoản trực tiếp</p>
                </div>
              </div>
              <ChevronRight className="size-4 text-slate-400" />
            </button>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            <button onClick={() => setMethod(null)} className="flex items-center gap-1 text-xs text-cyan-400 hover:underline">
              ← Chọn lại phương thức
            </button>
            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-slate-300">Số tiền cần rút (₫)</Label>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                className="bg-slate-900 border-slate-800 text-lg font-bold text-white rounded-2xl"
              />
              <p className="mt-1.5 text-xs text-slate-400">
                Khả dụng: <strong className="text-emerald-400">{formatCurrency(balance)}</strong> · Tối thiểu: 50.000₫
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5 text-xs text-slate-300">
              {method === 'momo' ? (
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-[#d82d8b]/15 text-[#d82d8b]"><Smartphone className="size-4" /></span>
                  <div>
                    <p className="font-bold text-white">Rút về MoMo</p>
                    <p className="text-slate-400">Đã liên kết số điện thoại tài khoản</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400"><Building2 className="size-4" /></span>
                  <div>
                    <p className="font-bold text-white">Ngân hàng thụ hưởng</p>
                    <p className="text-slate-400">Chuyển khoản nhanh qua tài khoản đã đăng ký</p>
                  </div>
                </div>
              )}
            </div>

            <Button className="w-full rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold" onClick={confirm}>
              Xác nhận rút tiền
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main Wallet Hub ────────────────────────────────────────────
export function DashboardWallet() {
  const { T, lang } = useLanguage();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
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

  useEffect(() => {
    fetchWallet();
    getMe().then(setProfile).catch(() => {});
  }, [fetchWallet]);

  // Handle PayOS return redirect (?orderCode=...&status=...)
  useEffect(() => {
    const orderCode = searchParams.get('orderCode');
    if (!orderCode || !user?.id) return;
    const status = searchParams.get('status');
    const cancelled = searchParams.get('cancel') === 'true' || status === 'CANCELLED';

    setSearchParams({}, { replace: true });

    if (cancelled) {
      toast.info('Giao dịch nạp tiền đã bị hủy.');
      return;
    }
    confirmPayos(orderCode)
      .then((txn) => {
        if (txn.status === 'COMPLETED') {
          toast.success(`Nạp thành công ${formatCurrency(txn.amount)} vào ví!`);
          fetchWallet();
          getMe().then(setProfile).catch(() => {});
        } else if (txn.status === 'FAILED') {
          toast.error('Giao dịch nạp tiền thất bại.');
        } else {
          toast.info('Giao dịch đang xử lý. Số dư sẽ cập nhật trong giây lát.');
        }
      })
      .catch((err: any) => toast.error(err?.response?.data?.message ?? 'Không thể xác nhận giao dịch.'));
  }, [user?.id, searchParams, setSearchParams, fetchWallet]);

  // Stats
  const escrowHeld = transactions.filter((t) => t.type === 'PAYMENT' && t.status === 'COMPLETED').reduce((s, t) => s + t.amount, 0);
  const totalSpent = transactions.filter((t) => t.type === 'PAYMENT').reduce((s, t) => s + t.amount, 0);
  const totalRefunded = transactions.filter((t) => t.type === 'REFUND').reduce((s, t) => s + t.amount, 0);

  const filtered = tab === 'All' ? transactions : transactions.filter((t) => t.type === tab.toUpperCase() || t.status === tab.toUpperCase());

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Ví Điện Tử & Quỹ Ký Quỹ Escrow
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Quản lý số dư học tập, nạp tiền tự động qua PayOS và theo dõi lịch sử bảo vệ ký quỹ.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Android app: no wallet top-ups (Google Play payments policy) — sessions are paid one by one. */}
          {!isNativeApp() && (
          <Button
            onClick={() => setShowAddFunds(true)}
            className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 transition-all gap-1.5"
          >
            <Plus className="size-4" /> Nạp tiền ví
          </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setShowWithdraw(true)}
            className="rounded-2xl border-slate-700 bg-slate-900/80 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            Rút tiền
          </Button>
        </div>
      </div>

      {/* ── Virtual DynForge Smart Card & Quick Presets ───────────────── */}
      <div className="grid gap-6 lg:grid-cols-12 items-stretch">
        
        {/* Holographic Virtual Student Card (5 cols) */}
        <div className="lg:col-span-5 relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 p-6 sm:p-7 backdrop-blur-2xl shadow-2xl flex flex-col justify-between min-h-[240px]">
          <div className="absolute top-0 right-0 size-48 rounded-full bg-cyan-500/10 blur-[60px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 size-48 rounded-full bg-indigo-500/10 blur-[60px] pointer-events-none" />

          {/* Card Top */}
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-black tracking-widest text-cyan-300 uppercase">DynForge Escrow Card</span>
            </div>
            <ShieldCheck className="size-5 text-cyan-400" />
          </div>

          {/* Card Chip & Balance */}
          <div className="my-5 z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 opacity-80 border border-amber-300/40 shadow-inner flex items-center justify-center">
                <span className="size-4 border border-black/30 rounded-xs" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Số dư khả dụng</span>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              <GsapCounter targetValue={balance} suffix="₫" />
            </div>
          </div>

          {/* Card Bottom */}
          <div className="flex items-end justify-between pt-3 border-t border-slate-800/80 z-10">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Chủ thẻ</p>
              <p className="text-xs font-bold text-slate-200 truncate max-w-[180px]">
                {profile?.fullName || user?.name || 'Học viên'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Mã SV / MSSV</p>
              <p className="text-xs font-bold text-cyan-400">
                {profile?.studentId || 'SE-STUDENT'}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Top-up Hub (7 cols) */}
        <div className="lg:col-span-7 rounded-3xl border border-slate-800/80 bg-slate-950/60 p-6 sm:p-7 backdrop-blur-xl shadow-xl flex flex-col justify-between">
          {isNativeApp() ? (
            <div className="text-sm text-slate-300 leading-relaxed">
              <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
                <Sparkles className="size-4 text-cyan-400" />
                Thanh toán từng buổi học
              </h3>
              Trên ứng dụng, mỗi buổi học được thanh toán riêng qua PayOS khi bạn đặt lịch. Số dư ví (nếu có) vẫn được dùng để thanh toán và có thể rút về ngân hàng.
            </div>
          ) : (
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="size-4 text-cyan-400" />
                  Nạp tiền nhanh (PayOS VietQR 24/7)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Chọn mệnh giá để quét mã VietQR ngân hàng không mất phí.</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { label: '50.000₫', val: 50000 },
                { label: '100.000₫', val: 100000 },
                { label: '200.000₫', val: 200000 },
                { label: '500.000₫', val: 500000 },
              ].map((item) => (
                <button
                  key={item.val}
                  onClick={() => setShowAddFunds(true)}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 text-center transition-all hover:border-cyan-500/40 hover:bg-slate-900 hover:scale-[1.02] group"
                >
                  <p className="text-sm font-bold text-white group-hover:text-cyan-300">{item.label}</p>
                  <span className="text-[10px] text-cyan-400 font-semibold flex items-center justify-center gap-0.5 mt-0.5">
                    Nạp ngay <ArrowUpRight className="size-2.5" />
                  </span>
                </button>
              ))}
            </div>
          </div>
          )}

          {/* Escrow Guarantee Highlight */}
          <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4 flex items-start gap-3">
            <ShieldCheck className="size-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-300 leading-relaxed">
              <strong className="text-emerald-200">Cơ chế Ký Quỹ Escrow bảo vệ an toàn:</strong> Tiền học của bạn luôn nằm an toàn trong Quỹ Ký Quỹ và chỉ được chuyển cho Mentor khi bạn xác nhận buổi học đã diễn ra trọn vẹn.
            </div>
          </div>
        </div>

      </div>

      {/* ── KPI Bento Metrics ────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-slate-800/80 bg-slate-950/60 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Khả dụng</span>
            <Wallet className="size-4 text-emerald-400" />
          </div>
          <p className="mt-3 text-2xl font-extrabold text-emerald-400 tracking-tight">{formatCurrency(balance)}</p>
          <p className="mt-1 text-[11px] text-slate-400">Sẵn sàng để đặt lịch học</p>
        </div>

        <div className="rounded-3xl border border-slate-800/80 bg-slate-950/60 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Đang giữ trong Escrow</span>
            <ShieldCheck className="size-4 text-amber-400" />
          </div>
          <p className="mt-3 text-2xl font-extrabold text-amber-300 tracking-tight">{formatCurrency(escrowHeld)}</p>
          <p className="mt-1 text-[11px] text-slate-400">Chờ hoàn tất buổi học</p>
        </div>

        <div className="rounded-3xl border border-slate-800/80 bg-slate-950/60 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Tổng chi tiêu học tập</span>
            <TrendingDown className="size-4 text-cyan-400" />
          </div>
          <p className="mt-3 text-2xl font-extrabold text-white tracking-tight">{formatCurrency(totalSpent)}</p>
          <p className="mt-1 text-[11px] text-slate-400">Đã thanh toán cho các buổi học</p>
        </div>

        <div className="rounded-3xl border border-slate-800/80 bg-slate-950/60 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Đã hoàn tiền</span>
            <RefreshCcw className="size-4 text-blue-400" />
          </div>
          <p className="mt-3 text-2xl font-extrabold text-blue-300 tracking-tight">{formatCurrency(totalRefunded)}</p>
          <p className="mt-1 text-[11px] text-slate-400">Hoàn về ví do hủy hoặc tranh chấp</p>
        </div>
      </div>

      {/* ── Transaction History Table ─────────────────────────────────── */}
      <div className="space-y-4 rounded-3xl border border-slate-800/80 bg-slate-950/60 p-5 sm:p-7 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
          <div>
            <h2 className="text-lg font-bold text-white">Lịch sử giao dịch ví</h2>
            <p className="text-xs text-slate-400">Theo dõi toàn bộ biến động số dư, nạp tiền và thanh toán ký quỹ.</p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { key: 'All', label: 'Tất cả' },
              { key: 'PAYMENT', label: 'Thanh toán' },
              { key: 'TOPUP', label: 'Nạp tiền' },
              { key: 'REFUND', label: 'Hoàn tiền' },
              { key: 'PAYOUT', label: 'Rút tiền' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'rounded-xl px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap',
                  tab === t.key
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
            <Loader2 className="size-5 animate-spin text-cyan-400" />
            <span className="text-xs font-medium">Đang tải lịch sử giao dịch…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center space-y-2 text-slate-400">
            <p className="text-sm font-semibold text-white">Chưa có giao dịch nào</p>
            <p className="text-xs">Khi bạn nạp tiền hoặc thanh toán buổi học, chi tiết sẽ hiển thị tại đây.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40">
            <Table>
              <TableHeader className="bg-slate-900/80">
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400 text-xs font-bold uppercase">Thời gian</TableHead>
                  <TableHead className="text-slate-400 text-xs font-bold uppercase">Loại giao dịch</TableHead>
                  <TableHead className="text-slate-400 text-xs font-bold uppercase">Nội dung</TableHead>
                  <TableHead className="text-slate-400 text-xs font-bold uppercase">Số tiền</TableHead>
                  <TableHead className="text-slate-400 text-xs font-bold uppercase">Trạng thái</TableHead>
                  <TableHead className="text-right text-slate-400 text-xs font-bold uppercase">Biên lai</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id} className="border-slate-800/60 hover:bg-slate-900/60 transition-colors">
                    <TableCell className="text-xs text-slate-300 whitespace-nowrap">
                      {formatDate(t.createdAt, lang, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      {' · '}
                      {new Date(t.createdAt).toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                        t.type === 'TOPUP' ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30' :
                        t.type === 'PAYMENT' ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30' :
                        t.type === 'REFUND' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' :
                        'bg-slate-800 text-slate-300'
                      )}>
                        {t.type === 'TOPUP' ? 'Nạp tiền' : t.type === 'PAYMENT' ? 'Ký quỹ học' : t.type === 'REFUND' ? 'Hoàn tiền' : t.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-200 max-w-[220px] truncate">
                      {t.description || 'Giao dịch ví DynForge'}
                    </TableCell>
                    <TableCell className="text-xs font-bold whitespace-nowrap">
                      <span className={cn(
                        t.type === 'TOPUP' || t.type === 'REFUND' ? 'text-emerald-400' : 'text-slate-100'
                      )}>
                        {t.type === 'TOPUP' || t.type === 'REFUND' ? '+' : '-'}{formatCurrency(t.amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={t.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/20 size-8 p-0" title="Chi tiết">
                        <Receipt className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {showAddFunds && !isNativeApp() && <AddFundsModal onClose={() => setShowAddFunds(false)} onSuccess={fetchWallet} />}
      {showWithdraw && <WithdrawModal onClose={() => setShowWithdraw(false)} balance={balance} />}
    </div>
  );
}
