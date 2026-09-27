import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { CheckCircle2, Loader2, Smartphone, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { ANDROID_APP_ID, APP_SCHEME, isNativeApp } from '../lib/platform';
import { getBookingById } from '../services/bookingService';
import { clearPendingPayment, loadPendingPayment, waitForPayment } from '../services/paymentService';

type Phase = 'handoff' | 'checking' | 'paid' | 'failed' | 'pending' | 'login';

/**
 * PayOS sends the buyer here after a per-session checkout.
 *
 * - Opened in the phone's browser with app=1: hand the buyer back to the Android app (dynforge://).
 * - Opened inside the app (via that deep link) or on the web: confirm with the backend, then show
 *   the escrow page for the booking.
 */
export function PaymentReturn() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lang } = useLanguage();
  const vi = lang === 'vi';

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const orderCode = params.get('orderCode');
  const bookingId = params.get('bookingId');
  const cancelled = params.get('cancel') === 'true' || params.get('status') === 'CANCELLED';
  const handOffToApp = params.get('app') === '1' && !isNativeApp();

  // Deep link back into the app. Chrome prefers intent:// (falls back gracefully if the app is missing).
  const query = location.search.startsWith('?') ? location.search.slice(1) : location.search;
  const appLink = `${APP_SCHEME}://payment-return?${query}`;
  const intentLink = `intent://payment-return?${query}#Intent;scheme=${APP_SCHEME};package=${ANDROID_APP_ID};end`;

  const [phase, setPhase] = useState<Phase>(
    handOffToApp ? 'handoff' : cancelled ? 'failed' : user ? 'checking' : 'login',
  );

  // Browser -> app hand-off
  useEffect(() => {
    if (!handOffToApp) return;
    const isAndroid = /Android/i.test(navigator.userAgent);
    window.location.href = isAndroid ? intentLink : appLink;
  }, [handOffToApp, intentLink, appLink]);

  // Confirm the payment (inside the app or on the web)
  useEffect(() => {
    if (phase !== 'checking' || !orderCode) return;
    const ctrl = new AbortController();
    (async () => {
      const txn = await waitForPayment(orderCode, { timeoutMs: 60_000, signal: ctrl.signal });
      if (ctrl.signal.aborted) return;
      if (!txn) { setPhase('pending'); return; }
      if (txn.status === 'FAILED') { setPhase('failed'); return; }

      setPhase('paid');
      const pending = loadPendingPayment();
      clearPendingPayment();
      const id = bookingId ?? pending?.bookingId;
      let booking: Awaited<ReturnType<typeof getBookingById>> | null = null;
      if (id) {
        try { booking = await getBookingById(id); } catch { /* fall back to the saved order info */ }
      }
      const start = booking ? new Date(booking.startAt) : null;
      navigate('/escrow', {
        replace: true,
        state: {
          mentor: pending?.mentor || booking?.mentorName || '',
          amount: booking?.price ?? pending?.amount ?? txn.amount,
          day: pending?.day ?? start?.getDate(),
          month: pending?.month ?? start?.getMonth(),
          year: pending?.year ?? start?.getFullYear(),
          slot: pending?.slot ?? (start ? start.toTimeString().slice(0, 5) : ''),
          duration: pending?.duration ?? booking?.durationMin,
          bookingId: id,
        },
      });
    })();
    return () => ctrl.abort();
  }, [phase, orderCode, bookingId, navigate]);

  return (
    <div className="bg-[#020B18] min-h-screen text-slate-200 flex items-center justify-center px-5 py-24">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#090f1e]/90 p-6 text-center">
        {phase === 'handoff' && (
          <>
            <Smartphone className="mx-auto size-10 text-cyan-300" />
            <h1 className="mt-3 text-xl font-semibold text-white">
              {cancelled ? (vi ? 'Đã huỷ thanh toán' : 'Payment cancelled') : (vi ? 'Thanh toán xong!' : 'Payment received!')}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {vi ? 'Quay lại ứng dụng DynForge để xem buổi học của bạn.' : 'Go back to the DynForge app to see your session.'}
            </p>
            <a
              href={/Android/i.test(navigator.userAgent) ? intentLink : appLink}
              className="mt-5 inline-block w-full rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white hover:bg-cyan-500"
            >
              {vi ? 'Mở ứng dụng DynForge' : 'Open the DynForge app'}
            </a>
          </>
        )}

        {phase === 'checking' && (
          <>
            <Loader2 className="mx-auto size-10 animate-spin text-cyan-300" />
            <p className="mt-3 text-sm text-slate-300">{vi ? 'Đang xác nhận thanh toán…' : 'Confirming your payment…'}</p>
          </>
        )}

        {phase === 'paid' && (
          <>
            <CheckCircle2 className="mx-auto size-10 text-emerald-400" />
            <p className="mt-3 text-sm text-slate-300">{vi ? 'Thanh toán thành công.' : 'Payment successful.'}</p>
          </>
        )}

        {phase === 'failed' && (
          <>
            <XCircle className="mx-auto size-10 text-rose-400" />
            <h1 className="mt-3 text-lg font-semibold text-white">{vi ? 'Thanh toán không thành công' : 'Payment not completed'}</h1>
            <p className="mt-2 text-sm text-slate-400">
              {vi ? 'Bạn chưa bị trừ tiền. Buổi học vẫn ở trạng thái chờ thanh toán.' : 'You were not charged. The session is still waiting for payment.'}
            </p>
            <Link to="/dashboard/sessions" className="mt-4 inline-block text-sm text-cyan-300 underline">
              {vi ? 'Xem lịch học của tôi' : 'My sessions'}
            </Link>
          </>
        )}

        {phase === 'pending' && (
          <>
            <Loader2 className="mx-auto size-10 text-amber-300" />
            <p className="mt-3 text-sm text-slate-300">
              {vi ? 'PayOS chưa xác nhận giao dịch. Vui lòng thử lại sau ít phút.' : 'PayOS has not confirmed the payment yet. Please try again in a few minutes.'}
            </p>
            <button onClick={() => setPhase('checking')} className="mt-4 text-sm text-cyan-300 underline">
              {vi ? 'Kiểm tra lại' : 'Check again'}
            </button>
          </>
        )}

        {phase === 'login' && (
          <>
            <p className="text-sm text-slate-300">{vi ? 'Đăng nhập để hoàn tất thanh toán.' : 'Log in to finish the payment.'}</p>
            <Link
              to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
              className="mt-4 inline-block rounded-xl bg-cyan-600 px-4 py-2 font-medium text-white"
            >
              {vi ? 'Đăng nhập' : 'Log in'}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
