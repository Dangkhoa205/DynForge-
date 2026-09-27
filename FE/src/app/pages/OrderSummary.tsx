import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams, Link } from 'react-router';
import {
  ShieldCheck, ChevronRight, CheckCircle2, X, Loader2,
  Wallet, Zap, RefreshCw, ExternalLink, AlertCircle, Building2,
  ArrowRight
} from 'lucide-react';
import { getMentor, formatCurrency, type Mentor } from '../data/mockData';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import { cn } from '../components/ui/utils';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { EditorialPageHeader } from '../components/EditorialPageHeader';
import { GsapTypewriter } from '../components/GsapTypewriter';
import { MouseFollowLight } from '../components/MouseFollowLight';
import { GsapCounter } from '../components/GsapCounter';
import { createBooking, payBooking, getBookingById } from '../services/bookingService';
import { isObjectId, getMentorById, backendToMentor } from '../services/mentorService';
import { getWallet, topUp, confirmPayos } from '../services/walletService';
import { toast } from 'sonner';
import { isNativeApp } from '../lib/platform';
import {
  createBookingCheckout, savePendingPayment, clearPendingPayment, waitForPayment, type PendingPayment,
} from '../services/paymentService';

interface BookingState {
  duration: number;
  mode: string;
  bookingFormat?: 'ONE_ON_ONE' | 'GROUP';
  displayMode?: string;
  format: string;
  day: number;
  month?: number;
  year?: number;
  slot: string;
  price: number;
  courseCode?: string;
  mentorId?: string;
}

const VALID_VOUCHERS: Record<string, { type: 'percentage' | 'fixed'; value: number; minOrder: number; label: string }> = {
  'DYNFORGE20': { type: 'percentage', value: 20, minOrder: 100000, label: '20% off' },
  'GRADORA20': { type: 'percentage', value: 20, minOrder: 100000, label: '20% off' },
  'GROUPDEAL': { type: 'fixed', value: 30000, minOrder: 55000, label: '30.000₫ off' },
  'LINH15': { type: 'percentage', value: 15, minOrder: 90000, label: "15% off (Linh's voucher)" },
  'TRIAL30K': { type: 'fixed', value: 30000, minOrder: 100000, label: '30.000₫ off (Trial)' },
  'WELCOME50K': { type: 'fixed', value: 50000, minOrder: 80000, label: '50.000₫ off (Welcome)' },
};

function calcDiscount(
  voucher: typeof VALID_VOUCHERS[string] | null,
  sessionFee: number
): number {
  if (!voucher) return 0;
  if (voucher.type === 'percentage') return Math.round(sessionFee * (voucher.value / 100));
  return voucher.value;
}

// ── Quick Top-Up Modal (PayOS VietQR) ────────────────────────
interface OrderTopUpModalProps {
  open: boolean;
  onClose: () => void;
  requiredAmount: number;
  currentBalance: number;
  onSuccess: (newBalance: number) => void;
  lang: string;
}

function OrderTopUpModal({
  open,
  onClose,
  requiredAmount,
  currentBalance,
  onSuccess,
  lang,
}: OrderTopUpModalProps) {
  const shortfall = Math.max(10000, requiredAmount - currentBalance);
  const [amount, setAmount] = useState(String(Math.ceil(shortfall / 1000) * 1000));
  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<'input' | 'waiting' | 'success'>('input');
  const pollIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (open) {
      const needed = Math.max(10000, requiredAmount - currentBalance);
      setAmount(String(Math.ceil(needed / 1000) * 1000));
      setStatus('input');
      setPaymentUrl(null);
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [open, requiredAmount, currentBalance]);

  const numAmount = parseInt(amount.replace(/\D/g, ''), 10) || 0;

  const checkBalanceNow = async () => {
    setChecking(true);
    try {
      const data = await getWallet();
      if (data && data.balance > currentBalance) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setStatus('success');
        onSuccess(data.balance);
        setTimeout(() => {
          onClose();
        }, 1400);
      } else {
        toast.info(lang === 'vi' ? 'Hệ thống chưa nhận được thanh toán. Vui lòng thử lại sau vài giây.' : 'Payment not detected yet. Please wait a moment.');
      }
    } catch {
      // ignore
    } finally {
      setChecking(false);
    }
  };

  const startTopUp = async () => {
    if (numAmount < 10000) {
      toast.error(lang === 'vi' ? 'Số tiền nạp tối thiểu là 10.000₫' : 'Minimum top-up is 10,000₫');
      return;
    }
    setLoading(true);
    try {
      const res = await topUp(numAmount);
      if (res && res.paymentUrl) {
        setPaymentUrl(res.paymentUrl);
        setStatus('waiting');
        // Open PayOS checkout in new tab so user never loses order state
        window.open(res.paymentUrl, '_blank');

        // Start polling wallet balance every 2.5s
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = setInterval(async () => {
          try {
            const data = await getWallet();
            if (data && data.balance > currentBalance) {
              clearInterval(pollIntervalRef.current);
              setStatus('success');
              onSuccess(data.balance);
              setTimeout(() => {
                onClose();
              }, 1400);
            }
          } catch {
            // silent polling error
          }
        }, 2500);
      } else {
        throw new Error('No payment URL returned');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? (lang === 'vi' ? 'Không thể khởi tạo cổng nạp tiền.' : 'Could not initiate top-up.'));
    } finally {
      setLoading(false);
    }
  };

  const presetAmounts = [
    { label: lang === 'vi' ? `Nạp đủ thiếu (${formatCurrency(shortfall)})` : `Shortfall (${formatCurrency(shortfall)})`, val: String(shortfall), isExact: true },
    { label: '50.000₫', val: '50000' },
    { label: '100.000₫', val: '100000' },
    { label: '200.000₫', val: '200000' },
    { label: '500.000₫', val: '500000' },
  ];

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-w-lg border border-white/15 bg-[#090f1e]/95 text-slate-100 backdrop-blur-2xl shadow-2xl rounded-2xl p-6 sm:p-7">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/20">
              <Zap className="size-5 fill-slate-950" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white tracking-tight">
                {lang === 'vi' ? 'Nạp tiền nhanh vào ví DynForge' : 'Quick Top-Up DynForge Wallet'}
              </DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                {lang === 'vi' ? 'Cổng thanh toán PayOS VietQR tự động 24/7' : 'Instant PayOS VietQR payment gateway'}
              </p>
            </div>
          </div>
        </DialogHeader>

        {status === 'input' && (
          <div className="mt-4 space-y-5">
            {/* Balance vs Requirement breakdown */}
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-white/[0.03] border border-white/10 p-3.5 text-center">
              <div>
                <p className="text-[11px] text-slate-400">{lang === 'vi' ? 'Cần thanh toán' : 'Order Total'}</p>
                <p className="text-sm font-bold text-white mt-0.5">{formatCurrency(requiredAmount)}</p>
              </div>
              <div className="border-x border-white/10 px-1">
                <p className="text-[11px] text-slate-400">{lang === 'vi' ? 'Ví hiện có' : 'Current Wallet'}</p>
                <p className="text-sm font-bold text-amber-400 mt-0.5">{formatCurrency(currentBalance)}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400">{lang === 'vi' ? 'Còn thiếu' : 'Shortfall'}</p>
                <p className="text-sm font-bold text-rose-400 mt-0.5">{formatCurrency(shortfall)}</p>
              </div>
            </div>

            {/* Amount input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs text-slate-300 font-medium">
                  {lang === 'vi' ? 'Số tiền muốn nạp (₫)' : 'Amount to top up (₫)'}
                </Label>
                <span className="text-[11px] text-slate-400">
                  {lang === 'vi' ? 'Tối thiểu 10.000₫' : 'Min 10,000₫'}
                </span>
              </div>
              <div className="relative">
                <Input
                  type="text"
                  value={amount ? Number(amount.replace(/\D/g, '')).toLocaleString('vi-VN') : ''}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setAmount(raw);
                  }}
                  className="bg-[#020b18] border-white/15 text-xl font-bold text-cyan-300 h-12 pr-12 focus:border-cyan-400 rounded-xl"
                  placeholder="105.000"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₫</span>
              </div>

              {/* Fast presets */}
              <div className="mt-3 flex flex-wrap gap-2">
                {presetAmounts.map((p) => {
                  const isSelected = amount === p.val;
                  return (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setAmount(p.val)}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5",
                        p.isExact
                          ? isSelected
                            ? "border-amber-400 bg-amber-500/20 text-amber-300 font-bold shadow-md shadow-amber-500/20 ring-1 ring-amber-400/50"
                            : "border-amber-500/40 bg-amber-500/10 text-amber-300 font-semibold hover:bg-amber-500/20"
                          : isSelected
                            ? "border-cyan-400 bg-cyan-500/20 text-cyan-300 font-semibold"
                            : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      {p.isExact && <Zap className="size-3 fill-amber-400 text-amber-400" />}
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payment Method description */}
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
              <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 shrink-0 border border-cyan-500/20">
                <Building2 className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  VietQR / PayOS
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">Tự động 24/7</span>
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Chuyển khoản qua mọi app ngân hàng / MB / VCB / VietinBank / Techcombank / MoMo
                </p>
              </div>
            </div>

            {/* Submit buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1 h-11 border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl"
              >
                {lang === 'vi' ? 'Hủy' : 'Cancel'}
              </Button>
              <Button
                type="button"
                onClick={startTopUp}
                disabled={loading || numAmount < 10000}
                className="flex-[2] h-11 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/25 transition-all"
              >
                {loading ? (
                  <><Loader2 className="size-4 animate-spin mr-2" /> {lang === 'vi' ? 'Đang tạo liên kết...' : 'Creating Link...'}</>
                ) : (
                  <><Zap className="size-4 fill-slate-950 mr-1.5" /> {lang === 'vi' ? `Nạp ${formatCurrency(numAmount)} qua VietQR` : `Top Up ${formatCurrency(numAmount)}`}</>
                )}
              </Button>
            </div>
          </div>
        )}

        {status === 'waiting' && (
          <div className="mt-4 space-y-5 text-center py-3">
            <div className="relative mx-auto flex size-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
              <div className="absolute inset-0 animate-ping rounded-2xl bg-cyan-400/10" />
              <Loader2 className="size-8 animate-spin text-cyan-400" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">
                {lang === 'vi' ? 'Đang chờ thanh toán...' : 'Waiting for payment...'}
              </h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto mt-1.5 leading-relaxed">
                {lang === 'vi'
                  ? 'Trang VietQR PayOS đã được mở trong tab mới. Hãy dùng app ngân hàng quét mã QR để chuyển khoản.'
                  : 'PayOS payment tab opened. Scan the VietQR code in your banking app to finish.'}
              </p>
            </div>

            <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3.5 text-xs text-cyan-300 flex items-center justify-between">
              <span>{lang === 'vi' ? 'Số tiền nạp:' : 'Amount:'} <strong className="text-white text-sm">{formatCurrency(numAmount)}</strong></span>
              <span className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                {lang === 'vi' ? 'Tự động kiểm tra' : 'Live polling'}
              </span>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {paymentUrl && (
                <a
                  href={paymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <ExternalLink className="size-3.5" />
                  {lang === 'vi' ? 'Mở lại trang thanh toán PayOS' : 'Reopen PayOS Checkout'}
                </a>
              )}

              <Button
                type="button"
                onClick={checkBalanceNow}
                disabled={checking}
                className="w-full h-11 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl"
              >
                {checking ? (
                  <><Loader2 className="size-4 animate-spin mr-2" /> {lang === 'vi' ? 'Đang kiểm tra...' : 'Checking...'}</>
                ) : (
                  <><RefreshCw className="size-4 mr-2" /> {lang === 'vi' ? 'Tôi đã chuyển khoản xong (Kiểm tra lại)' : 'I have completed payment'}</>
                )}
              </Button>

              <button
                type="button"
                onClick={onClose}
                className="text-xs text-slate-400 hover:text-slate-200 mt-1"
              >
                {lang === 'vi' ? 'Đóng cửa sổ này' : 'Close this window'}
              </button>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="mt-4 space-y-4 text-center py-6">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shadow-xl shadow-emerald-500/20">
              <CheckCircle2 className="size-9" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-emerald-300">
                {lang === 'vi' ? 'Nạp tiền thành công!' : 'Top-Up Successful!'}
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                {lang === 'vi' ? 'Số dư ví đã được cập nhật. Bạn có thể tiến hành đặt lịch ngay bây giờ.' : 'Wallet balance updated. You can confirm your booking now.'}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main Order Summary Page ──────────────────────────────────
export function OrderSummary() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { T, lang } = useLanguage();

  const [mentor, setMentor] = useState<Mentor | undefined>(() => getMentor(id));
  const [mentorLoading, setMentorLoading] = useState(isObjectId(id ?? ''));
  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<{ code: string; data: typeof VALID_VOUCHERS[string] } | null>(null);
  const [voucherError, setVoucherError] = useState('');
  const [applying, setApplying] = useState(false);
  const [paying, setPaying] = useState(false);

  // Wallet State
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);

  // Android app: every 1:1 session is paid on its own through PayOS (no wallet top-ups in the app,
  // see Google Play payments policy). `awaiting` = checkout opened in the browser, waiting for PayOS.
  const native = isNativeApp();
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);
  const [awaiting, setAwaiting] = useState<(PendingPayment & { paymentUrl: string }) | null>(null);

  useEffect(() => {
    if (!awaiting) return;
    const ctrl = new AbortController();
    waitForPayment(awaiting.orderCode, { signal: ctrl.signal }).then(async (txn) => {
      if (ctrl.signal.aborted || !txn) return;
      if (txn.status !== 'COMPLETED') {
        setAwaiting(null);
        toast.error(lang === 'vi' ? 'Thanh toán chưa thành công hoặc đã bị huỷ.' : 'The payment was not completed.');
        return;
      }
      clearPendingPayment();
      try {
        const b = await getBookingById(awaiting.bookingId);
        if (b.status === 'PENDING_PAYMENT' || b.status === 'CANCELLED') {
          toast.info(lang === 'vi'
            ? 'Đã nhận tiền nhưng buổi học không còn chờ thanh toán — số tiền đã được cộng vào ví của bạn.'
            : 'Payment received, but the session is no longer awaiting payment — the amount was added to your wallet.');
          navigate('/dashboard/wallet');
          return;
        }
      } catch { /* still show the escrow page */ }
      navigate('/escrow', {
        state: {
          mentor: awaiting.mentor, amount: awaiting.amount, day: awaiting.day, month: awaiting.month,
          year: awaiting.year, slot: awaiting.slot, duration: awaiting.duration, bookingId: awaiting.bookingId,
        },
      });
    });
    return () => ctrl.abort();
  }, [awaiting, navigate, lang]);

  useEffect(() => {
    if (!id || !isObjectId(id)) return;
    getMentorById(id)
      .then((p) => setMentor(backendToMentor(p)))
      .catch(() => { /* keep whatever is in state */ })
      .finally(() => setMentorLoading(false));
  }, [id]);

  const fetchWalletBalance = useCallback(async (silent = false) => {
    if (!user?.id) return;
    if (!silent) setBalanceLoading(true);
    try {
      const data = await getWallet();
      setWalletBalance(data.balance);
      return data.balance;
    } catch {
      // fallback
    } finally {
      if (!silent) setBalanceLoading(false);
    }
    return null;
  }, [user?.id]);

  // Initial fetch and on tab focus
  useEffect(() => {
    fetchWalletBalance();
    const onFocus = () => fetchWalletBalance(true);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchWalletBalance]);

  // Handle PayOS return redirect (?orderCode=...&status=...) if redirected directly
  useEffect(() => {
    const orderCode = searchParams.get('orderCode');
    if (!orderCode || !user?.id) return;
    const status = searchParams.get('status');
    const cancelled = searchParams.get('cancel') === 'true' || status === 'CANCELLED';

    // Clear PayOS params from URL
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('orderCode');
    newParams.delete('status');
    newParams.delete('cancel');
    setSearchParams(newParams, { replace: true });

    if (cancelled) {
      toast.info(lang === 'vi' ? 'Giao dịch nạp tiền đã hủy.' : 'Top-up was cancelled.');
      return;
    }

    confirmPayos(orderCode)
      .then((txn) => {
        if (txn.status === 'COMPLETED') {
          toast.success(
            lang === 'vi'
              ? `Nạp thành công ${formatCurrency(txn.amount)} vào ví!`
              : `Top-up of ${formatCurrency(txn.amount)} successful!`
          );
          fetchWalletBalance();
        } else if (txn.status === 'FAILED') {
          toast.error(lang === 'vi' ? 'Thanh toán thất bại hoặc đã hủy.' : 'Payment failed or was cancelled.');
        } else {
          toast.info(lang === 'vi' ? 'Thanh toán đang xử lý. Số dư sẽ cập nhật sớm.' : 'Payment is still processing.');
          fetchWalletBalance();
        }
      })
      .catch((err: any) => {
        toast.error(err?.response?.data?.message ?? 'Could not confirm payment.');
      });
  }, [searchParams, user?.id, lang, fetchWalletBalance, setSearchParams]);

  if (!user) {
    navigate(`/login?redirect=/mentors/${id}/order`);
    return null;
  }

  if (mentorLoading) {
    return (
      <div className="bg-[#020B18] min-h-screen flex items-center justify-center py-32 text-slate-400 gap-2">
        <Loader2 className="size-5 animate-spin text-cyan-400" /> Loading mentor…
      </div>
    );
  }

  if (!mentor) {
    return (
      <div className="bg-[#020B18] min-h-screen p-20 text-center text-slate-100">
        Mentor not found.
      </div>
    );
  }

  const now = new Date();
  const state = (location.state as BookingState) ?? {
    duration: 60,
    mode: '1-on-1',
    bookingFormat: 'ONE_ON_ONE' as const,
    format: 'Online',
    day: now.getDate() + 1,
    month: now.getMonth(),
    year: now.getFullYear(),
    slot: '09:00',
    price: mentor.hourlyRate,
  };

  const sessionFee = state.price;
  // In DynForge Escrow, 15% platform commission is deducted from mentor payout. Student platform fee is 0₫.
  const serviceFee = 0;
  const discount = 0;
  const total = sessionFee;
  const isInsufficient = walletBalance !== null && walletBalance < total;
  const shortfall = Math.max(0, total - (walletBalance ?? 0));

  const applyVoucher = () => {
    const code = voucherInput.trim().toUpperCase();
    if (!code) return;
    setApplying(true);
    setVoucherError('');

    setTimeout(() => {
      const found = VALID_VOUCHERS[code];
      if (!found) {
        setVoucherError('Invalid voucher code. Please check and try again.');
      } else if (sessionFee < found.minOrder) {
        setVoucherError(
          `Minimum order ${formatCurrency(found.minOrder)} required for this voucher.`
        );
      } else {
        setAppliedVoucher({ code, data: found });
        setVoucherInput('');
        setVoucherError('');
      }
      setApplying(false);
    }, 600);
  };

  const removeVoucher = () => {
    setAppliedVoucher(null);
    setVoucherError('');
  };

  // Android app: create the booking (once) and pay exactly this session through PayOS.
  const payWithPayos = async () => {
    if (!(user?.id && state.mentorId && state.courseCode && isObjectId(state.mentorId))) {
      toast.error(lang === 'vi'
        ? 'Vui lòng chọn mentor trong danh sách để đặt buổi học thật.'
        : 'Please pick a mentor from the live directory to book a real session.');
      return;
    }
    setPaying(true);
    try {
      let bookingId = pendingBookingId;
      if (!bookingId) {
        const yr = state.year ?? now.getFullYear();
        const mo = state.month ?? now.getMonth();
        const [h, m] = state.slot.split(':').map(Number);
        const booking = await createBooking({
          mentorId: state.mentorId,
          courseCode: state.courseCode,
          format: 'ONE_ON_ONE',
          startAt: new Date(yr, mo, state.day, h, m).toISOString(),
          durationMin: state.duration,
        });
        bookingId = booking.id;
        setPendingBookingId(bookingId);
      }
      const checkout = await createBookingCheckout(bookingId, true);
      const pending: PendingPayment = {
        orderCode: checkout.orderCode,
        bookingId,
        mentor: mentor.name,
        amount: checkout.amount,
        day: state.day,
        month: state.month,
        year: state.year,
        slot: state.slot,
        duration: state.duration,
      };
      savePendingPayment(pending);
      setAwaiting({ ...pending, paymentUrl: checkout.paymentUrl });
      window.open(checkout.paymentUrl, '_blank');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? (lang === 'vi' ? 'Không tạo được thanh toán PayOS.' : 'Could not start the PayOS payment.'));
    } finally {
      setPaying(false);
    }
  };

  const confirm = async () => {
    if (native && (walletBalance === null || walletBalance < total)) {
      await payWithPayos();
      return;
    }
    // If balance is already known to be insufficient, guide user directly to top-up
    if (walletBalance !== null && walletBalance < total) {
      setShowTopUpModal(true);
      toast.warning(
        lang === 'vi'
          ? `Số dư ví không đủ (${formatCurrency(walletBalance)}). Vui lòng nạp thêm ${formatCurrency(total - walletBalance)}.`
          : `Insufficient wallet balance (${formatCurrency(walletBalance)}). Please top up ${formatCurrency(total - walletBalance)}.`
      );
      return;
    }

    if (user?.id && state.mentorId && !isObjectId(state.mentorId)) {
      toast.error('This is a demo mentor profile. Please pick a mentor from the live directory to book a real session.');
      return;
    }

    if (user?.id && state.mentorId && state.courseCode && isObjectId(state.mentorId)) {
      setPaying(true);
      try {
        const yr = state.year ?? now.getFullYear();
        const mo = state.month ?? now.getMonth();
        const [h, m] = state.slot.split(':').map(Number);
        const startAt = new Date(yr, mo, state.day, h, m).toISOString();

        const format = state.bookingFormat ?? 'ONE_ON_ONE';
        const booking = await createBooking({
          mentorId: state.mentorId,
          courseCode: state.courseCode,
          format,
          startAt,
          durationMin: state.duration,
        });

        const paid = await payBooking(booking.id);

        navigate('/escrow', {
          state: {
            mentor: mentor.name,
            amount: paid.price,
            day: state.day,
            slot: state.slot,
            duration: state.duration,
            bookingId: paid.id,
          },
        });
      } catch (err: any) {
        const errMsg: string = err?.response?.data?.message ?? '';
        // If wallet balance is insufficient, offer 1-click top-up and open modal
        if (
          errMsg.toLowerCase().includes('balance') ||
          errMsg.toLowerCase().includes('insufficient') ||
          errMsg.toLowerCase().includes('không đủ')
        ) {
          setWalletBalance(0);
          if (native) {
            await payWithPayos();
            return;
          }
          setShowTopUpModal(true);
          toast.error(
            lang === 'vi'
              ? `Số dư ví không đủ để thanh toán. Vui lòng nạp tiền vào ví.`
              : (errMsg || 'Insufficient wallet balance. Please top up.'),
            {
              action: {
                label: lang === 'vi' ? '⚡ Nạp tiền ngay' : '⚡ Top Up Now',
                onClick: () => setShowTopUpModal(true),
              },
              duration: 7000,
            }
          );
        } else {
          toast.error(errMsg || 'Payment failed. Please try again.');
        }
      } finally {
        setPaying(false);
      }
    } else {
      navigate('/escrow', {
        state: { mentor: mentor.name, amount: total, day: state.day, month: state.month, year: state.year, slot: state.slot, duration: state.duration },
      });
    }
  };

  let formattedDate = `Day ${state.day}`;
  try {
    const yr = state.year ?? now.getFullYear();
    const mo = state.month ?? now.getMonth();
    const d = new Date(yr, mo, state.day);
    if (!isNaN(d.getTime())) {
      formattedDate = d.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-GB', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
  } catch {
    // fallback
  }

  const mentorAvatar = mentor.avatar?.trim()
    ? mentor.avatar
    : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

  return (
    <div className="relative z-10 pb-24 text-slate-100 min-h-screen">
      <MouseFollowLight />

      {/* Editorial Page Header */}
      <EditorialPageHeader
        eyebrow={lang === 'vi' ? 'XÁC NHẬN THANH TOÁN' : 'ORDER CONFIRMATION'}
        title={
          lang === 'vi' ? (
            <GsapTypewriter
              key="order-vi"
              prefix="Kiểm tra & "
              highlight="xác nhận."
              duration={2}
            />
          ) : (
            <GsapTypewriter
              key="order-en"
              prefix="Review & "
              highlight="confirm."
              duration={2}
            />
          )
        }
        subtitle={lang === 'vi' ? 'Khoản thanh toán của bạn sẽ được giữ an toàn trong ví Ký quỹ DynForge.' : 'Your payment is held safely in DynForge escrow until your session is completed.'}
      />

      <div className="mx-auto max-w-6xl px-6">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-slate-400">
          <Link to={`/mentors/${mentor.id}/schedule`} className="hover:text-cyan-300">Calendar</Link>
          <ChevronRight className="size-4" />
          <span className="text-white font-medium">Order Summary</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Main summary details */}
          <div className="space-y-6 lg:col-span-7">
            <Card className="border border-white/10 bg-[#090f1e]/90 backdrop-blur-xl p-6 text-slate-100 shadow-2xl rounded-2xl">
              <h2 className="mb-4 text-xl font-bold text-white tracking-tight">
                Session Details
              </h2>
              <div className="flex items-center gap-4 border-b border-white/10 pb-5">
                <ImageWithFallback src={mentorAvatar} alt={mentor.name} className="size-16 rounded-2xl object-cover border border-white/15" />
                <div>
                  <h3 className="font-semibold text-white text-lg">{mentor.name}</h3>
                  <p className="text-sm text-cyan-300 font-medium">{mentor.role}</p>
                  <p className="text-xs text-slate-400">{mentor.university}</p>
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm">
                <Row label="Learning Format" value={state.displayMode ?? state.mode} />
                <Row label="Session Format" value={state.format} />
                <Row label="Duration" value={`${state.duration} minutes`} />
                <Row label="Date" value={formattedDate} />
                <Row label="Time Slot" value={state.slot} />
                {state.courseCode && <Row label="Course Code" value={state.courseCode} />}
              </div>
            </Card>

            {/* Voucher input — hidden in the Android app: codes are not applied to the charged price yet */}
            {!native && (
            <Card className="border border-white/10 bg-[#090f1e]/90 backdrop-blur-xl p-6 text-slate-100 shadow-2xl rounded-2xl">
              <h2 className="mb-2 text-xl font-bold text-white tracking-tight">
                Apply Voucher
              </h2>
              <p className="mb-4 text-xs text-slate-400">Enter a platform or mentor promo code to get discounts.</p>

              {appliedVoucher ? (
                <div className="flex items-center justify-between rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3.5 text-sm text-cyan-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-cyan-400" />
                    <span>Voucher <strong>{appliedVoucher.code}</strong> applied ({appliedVoucher.data.label})</span>
                  </div>
                  <button onClick={removeVoucher} className="text-slate-400 hover:text-white">
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={voucherInput}
                    onChange={(e) => setVoucherInput(e.target.value)}
                    placeholder="Enter code (e.g. DYNFORGE20)"
                    className="bg-[#020b18] border-white/10 text-white uppercase placeholder:normal-case placeholder:text-slate-500"
                  />
                  <Button onClick={applyVoucher} disabled={applying || !voucherInput.trim()} className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium px-5 rounded-xl">
                    {applying ? <Loader2 className="size-4 animate-spin" /> : 'Apply'}
                  </Button>
                </div>
              )}
              {voucherError && <p className="mt-2 text-xs text-rose-400 font-medium">{voucherError}</p>}
            </Card>
            )}
          </div>

          {/* Pricing Sidebar */}
          <div className="lg:col-span-5">
            <Card className="border border-white/10 bg-[#090f1e]/90 backdrop-blur-xl p-6 text-slate-100 shadow-2xl rounded-2xl">
              <h2 className="mb-4 text-xl font-bold text-white tracking-tight">
                Payment Summary
              </h2>

              {/* Paying Account Details */}
              <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-8 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center text-xs shrink-0 border border-cyan-500/30">
                    {(user.fullName || user.email || 'U')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-400 font-medium truncate">
                      {lang === 'vi' ? 'Tài khoản thanh toán' : 'Paying account'}
                    </p>
                    <p className="text-sm font-semibold text-white truncate">
                      {user.fullName || user.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-medium px-2 py-1 rounded hover:bg-white/5 transition-colors shrink-0 ml-2"
                >
                  {lang === 'vi' ? 'Đổi tài khoản' : 'Switch'}
                </button>
              </div>

              {/* Wallet Balance Status Card */}
              <div className={cn(
                "mb-4 rounded-xl border p-3.5 transition-all",
                isInsufficient
                  ? "border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-950/20 to-transparent"
                  : "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-950/20 to-transparent"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className={cn("size-4", isInsufficient ? "text-amber-400" : "text-emerald-400")} />
                    <span className="text-xs font-semibold text-slate-200">
                      {lang === 'vi' ? 'Số dư ví DynForge' : 'DynForge Wallet Balance'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-base font-extrabold tracking-tight",
                      isInsufficient ? "text-amber-400" : "text-emerald-400"
                    )}>
                      {walletBalance !== null ? formatCurrency(walletBalance) : <Loader2 className="size-3.5 animate-spin text-slate-400" />}
                    </span>
                    <button
                      type="button"
                      onClick={() => fetchWalletBalance()}
                      disabled={balanceLoading}
                      title={lang === 'vi' ? 'Làm mới số dư' : 'Refresh balance'}
                      className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <RefreshCw className={cn("size-3.5", balanceLoading && "animate-spin text-cyan-400")} />
                    </button>
                  </div>
                </div>

                {/* Status details & Quick Top-Up link */}
                {walletBalance !== null && (
                  <div className="mt-2.5 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
                    {isInsufficient ? (
                      <>
                        <span className="text-rose-300 font-medium flex items-center gap-1">
                          <AlertCircle className="size-3.5 shrink-0 text-rose-400" />
                          {lang === 'vi' ? (
                            <>Thiếu: <strong className="text-white font-bold">{formatCurrency(shortfall)}</strong></>
                          ) : (
                            <>Short by: <strong className="text-white font-bold">{formatCurrency(shortfall)}</strong></>
                          )}
                        </span>
                        {!native && (
                        <button
                          type="button"
                          onClick={() => setShowTopUpModal(true)}
                          className="inline-flex items-center gap-1 font-bold text-amber-400 hover:text-amber-300 underline underline-offset-2"
                        >
                          <Zap className="size-3 fill-amber-400" />
                          {lang === 'vi' ? 'Nạp ngay' : 'Top up now'}
                        </button>
                        )}
                      </>
                    ) : (
                      <span className="text-emerald-300 font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />
                        {lang === 'vi' ? 'Số dư khả dụng đủ để thanh toán' : 'Balance is sufficient'}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Order breakdown */}
              <div className="space-y-3 text-sm border-b border-white/10 pb-4">
                <Row label="Session Fee" value={formatCurrency(sessionFee)} />
                <Row label="Platform Service Fee" value={lang === 'vi' ? '0₫ (Miễn phí học viên)' : '0₫ (Waived for students)'} />
                {appliedVoucher && (
                  <div className="flex justify-between text-cyan-300 font-medium">
                    <span>Promo Code ({appliedVoucher.code})</span>
                    <span className="text-emerald-400 font-semibold">{lang === 'vi' ? 'Đã áp dụng ưu đãi' : 'Promo Active'}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between text-lg font-bold text-white">
                <span>Total Amount</span>
                <span className="text-cyan-300 text-2xl font-extrabold">
                  <GsapCounter targetValue={total} suffix=" ₫" duration={1.2} />
                </span>
              </div>

              {/* CTA Action Buttons */}
              <div className="mt-6 space-y-3">
                {awaiting && (
                  <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3.5 text-sm text-cyan-100 space-y-2">
                    <p className="flex items-center gap-2 font-semibold">
                      <Loader2 className="size-4 animate-spin" />
                      {lang === 'vi' ? 'Đang chờ PayOS xác nhận…' : 'Waiting for PayOS…'}
                    </p>
                    <p className="text-xs text-cyan-200/80">
                      {lang === 'vi'
                        ? 'Hoàn tất thanh toán trong trình duyệt rồi quay lại ứng dụng. Màn hình sẽ tự chuyển khi thanh toán xong.'
                        : 'Finish paying in the browser, then come back to the app. This screen moves on by itself once paid.'}
                    </p>
                    <div className="flex gap-3 text-xs">
                      <button type="button" className="underline" onClick={() => window.open(awaiting.paymentUrl, '_blank')}>
                        {lang === 'vi' ? 'Mở lại trang thanh toán' : 'Reopen payment page'}
                      </button>
                      <button type="button" className="underline text-slate-300" onClick={() => setAwaiting(null)}>
                        {lang === 'vi' ? 'Huỷ chờ' : 'Stop waiting'}
                      </button>
                    </div>
                  </div>
                )}

                {isInsufficient && !native && (
                  <Button
                    type="button"
                    onClick={() => setShowTopUpModal(true)}
                    className="w-full h-12 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-extrabold rounded-xl shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 text-base transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <Zap className="size-5 fill-slate-950 text-slate-950" />
                    {lang === 'vi' ? '⚡ Nạp tiền nhanh vào ví (PayOS / VietQR)' : '⚡ Quick Top-Up Wallet (PayOS / VietQR)'}
                  </Button>
                )}

                <Button
                  onClick={confirm}
                  disabled={paying || !!awaiting}
                  className={cn(
                    "w-full h-12 font-semibold rounded-xl text-base transition-all",
                    isInsufficient && !native
                      ? "border border-cyan-500/30 bg-cyan-950/30 hover:bg-cyan-900/40 text-cyan-300"
                      : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-xl shadow-cyan-500/25 hover:scale-[1.01] active:scale-[0.99]"
                  )}
                >
                  {paying ? (
                    <><Loader2 className="size-5 animate-spin mr-2" /> Processing Payment…</>
                  ) : native && (walletBalance === null || walletBalance < total) ? (
                    <span className="flex items-center gap-2">
                      <Building2 className="size-4" />
                      {lang === 'vi' ? `Thanh toán ${formatCurrency(total)} qua PayOS` : `Pay ${formatCurrency(total)} with PayOS`}
                    </span>
                  ) : isInsufficient ? (
                    <span className="flex items-center gap-2 text-sm text-slate-300">
                      {lang === 'vi' ? 'Cần nạp thêm tiền để thanh toán Escrow' : 'Top up required to Pay via Escrow'}
                      <ArrowRight className="size-4" />
                    </span>
                  ) : (
                    'Pay via Escrow'
                  )}
                </Button>
              </div>

              <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                <span>Escrow Protection: Payment is held safely and only released after your session is complete.</span>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Quick Top-Up Dialog */}
      <OrderTopUpModal
        open={showTopUpModal && !native}
        onClose={() => setShowTopUpModal(false)}
        requiredAmount={total}
        currentBalance={walletBalance ?? 0}
        onSuccess={(newBal) => {
          setWalletBalance(newBal);
          toast.success(
            lang === 'vi'
              ? `Số dư ví đã sẵn sàng (${formatCurrency(newBal)}). Bạn có thể nhấn 'Pay via Escrow' ngay bây giờ!`
              : `Wallet ready (${formatCurrency(newBal)}). You can now Pay via Escrow!`
          );
        }}
        lang={lang}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-slate-300">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-slate-200">{value}</span>
    </div>
  );
}
