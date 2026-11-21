import { Link, useRouteError } from 'react-router';
import { GraduationCap, ShieldX, LifeBuoy, Home, LogOut } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Logo } from '../components/Logo';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

function ErrorShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#020B18] text-slate-100 px-5 selection:bg-cyan-500 selection:text-white">
      <div className="mb-8"><Logo light /></div>
      {children}
    </div>
  );
}

function resolveDashboardPath(user: any): string {
  if (!user) return '/login';
  if (user.role === 'admin') return '/admin/dashboard';
  if (user.role === 'mentor') return user.mentorVerified ? '/mentor/dashboard' : '/mentor/verification';
  return '/dashboard';
}

export function NotFoundPage() {
  const { T } = useLanguage();
  const { user } = useAuth();
  const dashTarget = resolveDashboardPath(user);

  return (
    <ErrorShell>
      <div className="flex size-24 items-center justify-center rounded-3xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
        <GraduationCap className="size-12" />
      </div>
      <h1 className="mt-6 text-center text-white font-bold text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
        {T.notFoundTitle}
      </h1>
      <p className="mt-3 max-w-sm text-center text-slate-400 text-sm leading-relaxed">{T.notFoundDesc}</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link to={dashTarget} className="inline-flex items-center justify-center bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-xl px-6 py-3 text-sm">{T.goToDashboard}</Link>
        <Link to="/" className="inline-flex items-center justify-center border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 rounded-xl px-6 py-3 text-sm">{T.backToHome}</Link>
        <Link to="/support/contact" className="inline-flex items-center justify-center text-slate-300 hover:bg-white/5 hover:text-white rounded-xl px-6 py-3 text-sm">
          <LifeBuoy className="size-4 mr-2" /> {T.contactSupport}
        </Link>
      </div>
    </ErrorShell>
  );
}

export function PermissionDeniedPage() {
  const { T, lang } = useLanguage();
  const { user, logout } = useAuth();
  const vi = lang === 'vi';
  const dashTarget = resolveDashboardPath(user);

  const dashboardBtnText = !user
    ? (vi ? 'Đăng nhập ngay' : 'Sign In Now')
    : user.role === 'admin'
      ? (vi ? 'Quay lại trang quản trị' : 'Back to Admin Console')
      : user.role === 'mentor'
        ? (vi ? 'Quay lại cổng Mentor' : 'Back to Mentor Portal')
        : (T.goBackDashboard ?? (vi ? 'Quay lại bảng điều khiển' : 'Back to Dashboard'));

  return (
    <ErrorShell>
      <div className="flex size-24 items-center justify-center rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
        <ShieldX className="size-12" />
      </div>
      <h1 className="mt-6 text-center text-white font-bold text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
        {T.permissionTitle}
      </h1>
      <p className="mt-3 max-w-sm text-center text-slate-400 text-sm leading-relaxed">{T.permissionDesc}</p>
      
      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
        <Link
          to={dashTarget}
          className="inline-flex items-center justify-center bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-xl px-6 py-3 text-sm shadow-lg shadow-cyan-900/30 transition-all cursor-pointer"
        >
          {dashboardBtnText}
        </Link>
        <Link
          to="/"
          className="inline-flex items-center justify-center border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 rounded-xl px-6 py-3 text-sm transition-all cursor-pointer"
        >
          <Home className="size-4 mr-2" />
          {T.backToHome ?? (vi ? 'Về trang chủ' : 'Back to Home')}
        </Link>
        {user && (
          <button
            onClick={() => logout()}
            className="inline-flex items-center justify-center border border-rose-500/20 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 rounded-xl px-4 py-3 text-sm transition-all cursor-pointer"
            title={vi ? 'Đăng xuất tài khoản hiện tại' : 'Log out of current account'}
          >
            <LogOut className="size-4 mr-1.5" />
            {vi ? 'Đổi tài khoản' : 'Switch Account'}
          </button>
        )}
      </div>
    </ErrorShell>
  );
}

export function GlobalErrorBoundary() {
  const { lang } = useLanguage();
  const vi = lang === 'vi';
  const error: any = useRouteError();
  console.error('GlobalErrorBoundary caught error:', error);
  const errorMessage = error?.message || error?.statusText || (typeof error === 'string' ? error : JSON.stringify(error));
  const errorStack = error?.stack;

  return (
    <ErrorShell>
      <h1 className="text-center text-white font-bold text-4xl" style={{ fontFamily: "var(--font-heading)" }}>{vi ? 'Lỗi ứng dụng' : 'Application Error'}</h1>
      <p className="mt-3 max-w-md text-center text-slate-400 text-sm">{vi ? 'Đã xảy ra lỗi không mong muốn. Vui lòng thử quay lại trang chủ.' : 'An unexpected error occurred. Please try returning to home.'}</p>
      {errorMessage && (
        <div className="mt-4 max-w-xl w-full text-left rounded-xl border border-red-500/30 bg-red-950/40 p-4">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">{vi ? 'Chi tiết lỗi:' : 'Error Details:'}</p>
          <p className="text-xs font-mono text-red-200 break-words">{errorMessage}</p>
          {errorStack && (
            <pre className="mt-2 text-[10px] font-mono text-red-300/70 overflow-x-auto max-h-40 whitespace-pre-wrap">
              {errorStack}
            </pre>
          )}
        </div>
      )}
      <a href="/" className="mt-6 inline-block bg-cyan-600 hover:bg-cyan-500 text-white font-medium px-8 py-3 rounded-xl text-sm">
        {vi ? 'Tải lại trang chủ' : 'Reload Home'}
      </a>
    </ErrorShell>
  );
}
