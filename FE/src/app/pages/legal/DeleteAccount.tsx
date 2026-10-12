import { useState } from 'react';
import { Link } from 'react-router';
import { CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { deleteMyAccount } from '../../services/userService';
import { SUPPORT_EMAIL } from './LegalPage';

/**
 * Public page required by Google Play ("web link where users can request account deletion") and
 * also the in-app path (Settings -> Danger zone links here). Logged-in users can delete directly.
 */
export function DeleteAccount() {
  const { user, logout } = useAuth();
  const { lang } = useLanguage();
  const vi = lang === 'vi';
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await deleteMyAccount(email.trim());
      await logout();
      setDone(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? (vi ? 'Không xoá được tài khoản. Vui lòng thử lại.' : 'Could not delete the account. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[#020B18] min-h-screen text-slate-200">
      <div className="mx-auto max-w-2xl px-5 pt-24 pb-16 sm:pt-28">
        <h1 className="text-4xl sm:text-5xl text-white font-normal leading-tight" style={{ fontFamily: "'Instrument Serif', serif" }}>
          {vi ? 'Xoá tài khoản DynForge' : 'Delete your DynForge account'}
        </h1>

        {done ? (
          <div className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
            <p className="flex items-center gap-2 font-semibold text-emerald-300">
              <CheckCircle2 className="size-5" /> {vi ? 'Tài khoản đã được xoá.' : 'Your account has been deleted.'}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              {vi ? 'Cảm ơn bạn đã sử dụng DynForge.' : 'Thank you for using DynForge.'}
            </p>
            <Link to="/" className="mt-4 inline-block text-sm text-cyan-300 underline">
              {vi ? 'Về trang chủ' : 'Back to home'}
            </Link>
          </div>
        ) : (
          <>
            <section className="mt-6 space-y-3 text-sm leading-relaxed text-slate-300">
              <p>
                {vi
                  ? 'Bạn có thể xoá tài khoản ngay tại trang này hoặc trong ứng dụng: Cài đặt → Xoá tài khoản.'
                  : 'You can delete your account on this page or in the app: Settings → Delete account.'}
              </p>
              <div>
                <p className="font-semibold text-white">{vi ? 'Sẽ bị xoá:' : 'Deleted:'}</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>{vi ? 'Họ tên, email, số điện thoại, mã sinh viên, ảnh đại diện, email trường' : 'Name, email, phone, student ID, avatar, school email'}</li>
                  <li>{vi ? 'Hồ sơ mentor, yêu cầu xác minh và bảng điểm' : 'Mentor profile, verification requests and transcripts'}</li>
                  <li>{vi ? 'Tin nhắn và video ghi hình buổi học' : 'Messages and session recordings'}</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-white">{vi ? 'Được ẩn danh và giữ lại:' : 'Anonymised and kept:'}</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>{vi ? 'Lịch sử buổi học đã thanh toán và giao dịch ví (đối soát kế toán, khiếu nại)' : 'Paid session history and wallet transactions (accounting, complaints)'}</li>
                  <li>{vi ? 'Đánh giá đã viết (không còn gắn với tên bạn)' : 'Reviews you wrote (no longer linked to your name)'}</li>
                </ul>
              </div>
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200">
                {vi
                  ? 'Trước khi xoá: rút hết số dư ví và hoàn tất các buổi học đã thanh toán. Xoá tài khoản không thể hoàn tác.'
                  : 'Before deleting: withdraw your wallet balance and finish any paid sessions. Deletion cannot be undone.'}
              </p>
            </section>

            {user ? (
              <form onSubmit={submit} className="mt-8 space-y-3 rounded-2xl border border-white/10 bg-[#090f1e]/90 p-5">
                <label htmlFor="confirm-email" className="block text-sm text-slate-300">
                  {vi ? `Nhập email của bạn (${user.email}) để xác nhận:` : `Type your email (${user.email}) to confirm:`}
                </label>
                <Input
                  id="confirm-email"
                  type="email"
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={busy || email.trim().toLowerCase() !== (user.email ?? '').toLowerCase()}
                  className="w-full"
                >
                  {busy ? <Loader2 className="size-4 animate-spin mr-2" /> : <Trash2 className="size-4 mr-2" />}
                  {vi ? 'Xoá vĩnh viễn tài khoản' : 'Permanently delete my account'}
                </Button>
              </form>
            ) : (
              <div className="mt-8 space-y-3 rounded-2xl border border-white/10 bg-[#090f1e]/90 p-5 text-sm">
                <p>{vi ? 'Đăng nhập để xoá tài khoản của bạn:' : 'Log in to delete your account:'}</p>
                <Link
                  to="/login?redirect=%2Fdelete-account"
                  className="inline-block rounded-xl bg-cyan-600 px-4 py-2 font-medium text-white hover:bg-cyan-500"
                >
                  {vi ? 'Đăng nhập' : 'Log in'}
                </Link>
                <p className="text-slate-400">
                  {vi ? 'Không đăng nhập được? Gửi yêu cầu xoá từ email đã đăng ký tới ' : 'Cannot log in? Email a deletion request from your registered address to '}
                  <a className="text-cyan-300 underline" href={`mailto:${SUPPORT_EMAIL}?subject=Delete%20my%20DynForge%20account`}>{SUPPORT_EMAIL}</a>
                  {vi ? '. Chúng tôi xử lý trong vòng 15 ngày.' : '. We process requests within 15 days.'}
                </p>
              </div>
            )}

            <p className="mt-8 text-xs text-slate-500">
              {vi ? 'Chi tiết: ' : 'Details: '}
              <Link to="/privacy" className="text-cyan-300 underline">{vi ? 'Chính sách bảo mật' : 'Privacy Policy'}</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
