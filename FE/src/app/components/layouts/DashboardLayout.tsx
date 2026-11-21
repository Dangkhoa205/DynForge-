import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, Link, ScrollRestoration } from 'react-router';
import {
  CalendarCheck, Wallet, AlertTriangle, User, Settings,
  LayoutDashboard, ShieldCheck, Calendar, Clock, TrendingUp,
  BadgeCheck, Users, FileText, BarChart3, CreditCard,
  LogOut, BookMarked, MessageSquare, Tag, Video, Menu, X,
  GraduationCap, Plus, Sparkles, ExternalLink, ChevronRight, ArrowLeftRight,
  Megaphone, Lock, PieChart, MessageSquareText
} from 'lucide-react';
import { cn } from '../ui/utils';
import { Logo } from '../Logo';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getMe, type UserProfile } from '../../services/userService';
import { formatCurrency } from '../../data/mockData';
import { toast } from 'sonner';

type Role = 'student' | 'teacher' | 'admin';

interface NavItem {
  to: string;
  labelKey: string;
  icon: React.ElementType;
  end?: boolean;
  badge?: string;
}

const studentNav: NavItem[] = [
  { to: '/dashboard',          labelKey: 'mySessions',          icon: CalendarCheck, end: true },
  { to: '/dashboard/wallet',   labelKey: 'walletTransactions',   icon: Wallet },
  { to: '/messages',           labelKey: 'messages',             icon: MessageSquare },
  { to: '/dashboard/disputes', labelKey: 'disputesComplaints',   icon: AlertTriangle },
  { to: '/dashboard/profile',  labelKey: 'profile',              icon: User },
  { to: '/dashboard/settings', labelKey: 'settings',             icon: Settings },
];

const teacherNav: NavItem[] = [
  { to: '/mentor/dashboard',     labelKey: 'teachingDashboard', icon: LayoutDashboard, end: true },
  { to: '/mentor/sessions',      labelKey: 'mySessionsMentor',  icon: CalendarCheck },
  { to: '/mentor/calendar',      labelKey: 'calendar',          icon: Calendar },
  { to: '/mentor/availability',  labelKey: 'availability',      icon: Clock },
  { to: '/mentor/messages',      labelKey: 'messages',          icon: MessageSquare },
  { to: '/mentor/earnings',      labelKey: 'earnings',          icon: TrendingUp },
  { to: '/mentor/vouchers',      labelKey: 'vouchers',          icon: Tag },
  { to: '/mentor/disputes',      labelKey: 'disputes',          icon: AlertTriangle },
  { to: '/mentor/profile',       labelKey: 'profile',           icon: User },
  { to: '/mentor/verification',  labelKey: 'verification',      icon: BadgeCheck },
  { to: '/mentor/settings',      labelKey: 'settings',          icon: Settings },
];

const lockedTeacherRoutes = [
  '/mentor/dashboard',
  '/mentor/sessions',
  '/mentor/calendar',
  '/mentor/availability',
  '/mentor/messages',
  '/mentor/earnings',
  '/mentor/vouchers',
  '/mentor/disputes',
];

const adminNav: NavItem[] = [
  { to: '/admin/dashboard',           labelKey: 'dashboard',           icon: LayoutDashboard, end: true },
  { to: '/admin/users',               labelKey: 'users',               icon: Users },
  { to: '/admin/user-insights',       labelKey: 'userInsights',        icon: PieChart },
  { to: '/admin/feedback',            labelKey: 'userFeedback',        icon: MessageSquareText },
  { to: '/admin/mentors',             labelKey: 'mentors',             icon: User },
  { to: '/admin/mentor-verification', labelKey: 'mentorVerification',  icon: ShieldCheck },
  { to: '/admin/transactions',        labelKey: 'transactions',        icon: CreditCard },
  { to: '/admin/commission-revenue',  labelKey: 'commissionRevenue',   icon: TrendingUp },
  { to: '/admin/payouts',             labelKey: 'payoutsRefunds',      icon: Wallet },
  { to: '/admin/vouchers',            labelKey: 'adminVouchers',       icon: Tag },
  { to: '/admin/disputes',            labelKey: 'adminDisputes',       icon: AlertTriangle },
  { to: '/admin/recordings',          labelKey: 'recordings',          icon: Video },
  { to: '/admin/resources',           labelKey: 'adminResources',      icon: BookMarked },
  { to: '/admin/partnerships',        labelKey: 'partnerships',        icon: Megaphone },
  { to: '/admin/reports',             labelKey: 'reports',             icon: BarChart3 },
  { to: '/admin/settings',            labelKey: 'settings',            icon: Settings },
  { to: '/admin/audit-logs',          labelKey: 'auditLogs',           icon: FileText },
];

const roleNavMap: Record<Role, NavItem[]> = {
  student: studentNav,
  teacher: teacherNav,
  admin: adminNav,
};

const fallbackAvatar: Record<Role, string> = {
  student: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80',
  teacher: 'https://images.unsplash.com/photo-1531427888099-b3ecff6e1a6f?auto=format&fit=crop&w=80&q=80',
  admin: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80',
};

export function DashboardLayout({ role = 'student' }: { role?: Role }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const { T, lang } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const nav = roleNavMap[role];

  useEffect(() => {
    let mounted = true;
    getMe()
      .then((data) => {
        if (mounted) setProfile(data);
      })
      .catch(() => {
        // Fallback or unauthenticated
      });
    return () => { mounted = false; };
  }, [user?.id]);

  const userLabel = profile?.fullName || user?.name || 'Học viên';
  const avatar = profile?.avatarUrl || user?.avatar || fallbackAvatar[role];
  const walletBalance = profile?.walletBalance ?? 0;

  const handleLogout = async () => {
    await logout();
    toast.success(lang === 'vi' ? 'Đã đăng xuất thành công.' : 'Signed out successfully.');
    navigate('/');
  };

  const txtWallet = lang === 'vi' ? 'Ví Ký Quỹ' : 'Escrow Wallet';
  const txtTopUp = lang === 'vi' ? 'Nạp tiền' : 'Top up';
  const txtNavigation = lang === 'vi' ? 'Điều hướng' : 'Navigation';
  const txtDiscover = lang === 'vi' ? 'Khám phá Mentor mới' : 'Discover new mentors';

  const portalLabel =
    role === 'teacher' ? (T.mentorPortal ?? 'Mentor Portal')
    : role === 'admin' ? (T.adminConsole ?? 'Admin Console')
    : (T.studentWorkspace ?? 'Student Workspace');

  // A mentor account is also a mentee: let it hop between the two workspaces.
  const isMentorVerified = profile?.mentorVerified ?? user?.mentorVerified ?? false;
  const isMentorPending = role === 'teacher' && !isMentorVerified;

  const canSwitchWorkspace = user?.role === 'mentor' && (role === 'student' || role === 'teacher');
  const switchTo = role === 'teacher' ? '/dashboard' : (isMentorVerified ? '/mentor/dashboard' : '/mentor/verification');
  const switchLabel = role === 'teacher'
    ? (lang === 'vi' ? 'Chế độ học viên' : 'Mentee mode')
    : (lang === 'vi' ? 'Chế độ mentor' : 'Mentor mode');
  const switchTitle = role === 'teacher'
    ? (lang === 'vi' ? 'Chuyển sang bảng điều khiển học viên' : 'Switch to the mentee dashboard')
    : (lang === 'vi' ? 'Chuyển sang cổng mentor' : 'Switch to the mentor portal');

  const portalBadge =
    role === 'teacher'
      ? (isMentorPending ? (lang === 'vi' ? 'Mentor (Chờ duyệt)' : 'Mentor (Pending)') : 'Mentor')
      : role === 'admin'
        ? 'Admin'
        : 'Mentee';

  return (
    <div className="flex min-h-screen bg-[#020b18] text-slate-100 selection:bg-cyan-500 selection:text-white relative overflow-x-hidden">
      {/* Background ambient gradient glow circles */}
      <div className="pointer-events-none fixed -top-40 -left-40 size-96 rounded-full bg-cyan-600/10 blur-[130px]" />
      <div className="pointer-events-none fixed top-1/3 -right-40 size-[32rem] rounded-full bg-indigo-600/10 blur-[150px]" />
      <div className="pointer-events-none fixed -bottom-40 left-1/4 size-96 rounded-full bg-blue-600/10 blur-[130px]" />

      {/* Sidebar (Desktop Dark Glass Panel with Cyber-Academic Accents) */}
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-slate-800/80 bg-slate-950/70 px-4 py-5 backdrop-blur-2xl lg:flex z-30">
        
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 pb-4 border-b border-slate-800/60">
          <Link to="/" className="flex items-center gap-2 group transition-transform hover:scale-[1.02]">
            <Logo light />
          </Link>
          <span className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wider uppercase",
            isMentorPending
              ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
              : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
          )}>
            <span className={cn(
              "size-1.5 rounded-full animate-pulse",
              isMentorPending ? "bg-amber-400" : "bg-cyan-400"
            )} />
            {portalBadge}
          </span>
        </div>

        {/* User quick badge inside sidebar */}
        <div className="mt-4 mx-1 rounded-2xl border border-slate-800/70 bg-gradient-to-b from-slate-900/60 to-slate-900/30 p-3 backdrop-blur-md shadow-inner">
          <div className="flex items-center gap-3">
            <div className="relative size-10 shrink-0">
              <ImageWithFallback
                src={avatar}
                alt={userLabel}
                className="size-10 rounded-xl object-cover ring-2 ring-cyan-500/30 ring-offset-2 ring-offset-slate-950"
              />
              <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-slate-950 bg-emerald-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white tracking-tight">{userLabel}</p>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                {profile?.universityName ? (
                  <span className="truncate text-cyan-400 flex items-center gap-1">
                    <GraduationCap className="size-3 shrink-0" />
                    {profile.universityCode || profile.universityName}
                  </span>
                ) : (
                  <span className="text-slate-400 capitalize">{role}</span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Wallet Bar in Sidebar (for students) */}
          {role === 'student' && (
            <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">{txtWallet}</span>
                <p className="text-xs font-bold text-emerald-400 tracking-tight">{formatCurrency(walletBalance)}</p>
              </div>
              <Link
                to="/dashboard/wallet"
                className="flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-all hover:scale-105"
              >
                <Plus className="size-3" /> {txtTopUp}
              </Link>
            </div>
          )}
        </div>

        {/* Navigation list */}
        <nav className="mt-4 flex flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
          <div className="px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {txtNavigation}
          </div>
          {nav.map((item) => {
            const Icon = item.icon;
            const label = (T as Record<string, string>)[item.labelKey] ?? item.labelKey;
            const isLocked = isMentorPending && lockedTeacherRoutes.includes(item.to);
            const destination = isLocked ? '/mentor/verification' : item.to;
            const isVerificationActive = item.to === '/mentor/verification' && isMentorPending;

            return (
              <NavLink
                key={item.to}
                to={destination}
                end={item.end}
                onClick={() => {
                  if (isLocked) {
                    toast.info(lang === 'vi' 
                      ? 'Tính năng này đang tạm khóa. Vui lòng hoàn tất hoặc chờ Ban quản trị duyệt hồ sơ.' 
                      : 'This feature is locked. Please wait for Admin approval.');
                  }
                }}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive && !isLocked
                      ? 'bg-gradient-to-r from-cyan-500/20 via-blue-500/15 to-transparent text-cyan-300 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.12)] font-semibold translate-x-1'
                      : isLocked
                        ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/40 border border-transparent'
                        : 'text-slate-300 hover:bg-slate-900/60 hover:text-white hover:border-slate-800 border border-transparent'
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <span className={cn(
                    'flex size-8 items-center justify-center rounded-lg transition-colors',
                    isLocked 
                      ? 'bg-slate-950/60 border border-slate-900 text-slate-600'
                      : 'bg-slate-900/80 border border-slate-800 text-slate-300 group-hover:border-cyan-500/30 group-hover:text-cyan-400 group-hover:bg-cyan-950/20'
                  )}>
                    <Icon className="size-4 shrink-0" />
                  </span>
                  <span className={isLocked ? 'text-slate-400' : ''}>{label}</span>
                </div>
                {isLocked ? (
                  <span className="flex items-center gap-1 text-[10px] text-amber-400/80 font-medium bg-amber-500/10 border border-amber-500/20 rounded-md px-1.5 py-0.5">
                    <Lock className="size-3" />
                    <span className="hidden xl:inline">{lang === 'vi' ? 'Khóa' : 'Locked'}</span>
                  </span>
                ) : isVerificationActive ? (
                  <span className="rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 border border-amber-500/30 animate-pulse">
                    {lang === 'vi' ? 'Cần duyệt' : 'Pending'}
                  </span>
                ) : (
                  <ChevronRight className="size-3.5 opacity-0 -translate-x-1 text-cyan-400/70 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer Action */}
        <div className="mt-auto pt-3 border-t border-slate-800/80 flex flex-col gap-2">
          {canSwitchWorkspace && (
            <Link
              to={switchTo}
              title={switchTitle}
              className="flex items-center justify-between rounded-xl border border-indigo-500/30 bg-indigo-950/30 px-3.5 py-2 text-xs font-semibold text-indigo-200 hover:border-indigo-400/50 hover:bg-indigo-950/50 transition-all"
            >
              <span className="flex items-center gap-2">
                <ArrowLeftRight className="size-3.5 text-indigo-300" />
                {switchTitle}
              </span>
              <ChevronRight className="size-3 opacity-60" />
            </Link>
          )}
          <Link
            to="/mentors"
            className="flex items-center justify-between rounded-xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/30 to-indigo-950/30 px-3.5 py-2 text-xs font-medium text-cyan-300 hover:border-cyan-500/40 hover:bg-cyan-950/40 transition-all"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="size-3.5 text-cyan-400" />
              {txtDiscover}
            </span>
            <ExternalLink className="size-3 opacity-60" />
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-400 hover:bg-red-950/30 hover:text-red-400 hover:border hover:border-red-500/20 transition-all cursor-pointer"
          >
            <LogOut className="size-4" /> {T.logOut ?? 'Đăng xuất'}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileNavOpen(false)}
          />

          {/* Drawer Content Panel */}
          <aside className="relative z-10 flex h-full w-[85vw] max-w-xs flex-col border-r border-slate-800/80 bg-[#030914]/98 px-5 py-5 shadow-2xl backdrop-blur-2xl animate-in slide-in-from-left duration-300 overflow-hidden">
            {/* Ambient Decorative Glow Circles */}
            <div className="pointer-events-none absolute -top-16 -left-16 size-48 rounded-full bg-cyan-500/15 blur-3xl" />
            <div className="pointer-events-none absolute bottom-20 -right-16 size-44 rounded-full bg-indigo-600/15 blur-3xl" />

            {/* Top Brand Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 shrink-0">
              <div className="flex items-center gap-2">
                <Logo light size="sm" />
                <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-cyan-300 uppercase">
                  <span className="size-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  {portalBadge}
                </span>
              </div>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="flex size-9 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close menu"
              >
                <X className="size-4.5" />
              </button>
            </div>

            {/* Quick Wallet Bar in Drawer (for students) */}
            {role === 'student' && (
              <div className="mt-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3 backdrop-blur-md shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">{txtWallet}</span>
                    <p className="text-sm font-bold text-emerald-400">{formatCurrency(walletBalance)}</p>
                  </div>
                  <Link
                    to="/dashboard/wallet"
                    onClick={() => setMobileNavOpen(false)}
                    className="flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-all hover:scale-105"
                  >
                    <Plus className="size-3" /> {txtTopUp}
                  </Link>
                </div>
              </div>
            )}

            {/* Navigation items list */}
            <nav className="mt-4 flex flex-1 flex-col gap-1 overflow-y-auto pr-1">
              {nav.map((item) => {
                const Icon = item.icon;
                const label = (T as Record<string, string>)[item.labelKey] ?? item.labelKey;
                const isLocked = isMentorPending && lockedTeacherRoutes.includes(item.to);
                const destination = isLocked ? '/mentor/verification' : item.to;
                const isVerificationActive = item.to === '/mentor/verification' && isMentorPending;

                return (
                  <NavLink
                    key={item.to}
                    to={destination}
                    end={item.end}
                    onClick={() => {
                      setMobileNavOpen(false);
                      if (isLocked) {
                        toast.info(lang === 'vi' 
                          ? 'Tính năng này đang tạm khóa. Vui lòng hoàn tất hoặc chờ Ban quản trị duyệt hồ sơ.' 
                          : 'This feature is locked. Please wait for Admin approval.');
                      }
                    }}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all',
                        isActive && !isLocked
                          ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/40 shadow-md shadow-cyan-950/40 font-semibold'
                          : isLocked
                            ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/40 border border-transparent'
                            : 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className={cn('size-4.5 shrink-0 transition-colors', isLocked ? 'text-slate-600' : isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-300')} />
                          <span className={cn('truncate', isLocked && 'text-slate-400')}>{label}</span>
                        </div>
                        {isLocked ? (
                          <span className="flex items-center gap-1 text-[10px] text-amber-400/80 font-medium bg-amber-500/10 border border-amber-500/20 rounded-md px-1.5 py-0.5">
                            <Lock className="size-3" />
                            <span>{lang === 'vi' ? 'Khóa' : 'Locked'}</span>
                          </span>
                        ) : isVerificationActive ? (
                          <span className="rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 border border-amber-500/30 animate-pulse">
                            {lang === 'vi' ? 'Cần duyệt' : 'Pending'}
                          </span>
                        ) : (
                          <ChevronRight className={cn('size-4 shrink-0 transition-transform group-hover:translate-x-0.5', isActive ? 'text-cyan-400' : 'text-slate-600 group-hover:text-slate-400')} />
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            {/* Footer Profile & Logout */}
            <div className="mt-auto pt-4 border-t border-slate-800/80 shrink-0 space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="relative size-10 shrink-0">
                  <ImageWithFallback
                    src={avatar}
                    alt={userLabel}
                    className="size-10 rounded-xl object-cover ring-2 ring-cyan-500/30"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-slate-950 bg-emerald-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white tracking-tight">{userLabel}</p>
                  <p className="truncate text-xs text-cyan-400 font-medium">{portalLabel}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 px-1">
                <LanguageSwitcher />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="size-3.5" />
                  <span>{T.logOut ?? 'Đăng xuất'}</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Area */}
      <div className="flex min-w-0 flex-1 flex-col z-10">
        
        {/* Top Header Bar */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-800/80 bg-slate-950/60 px-3 sm:px-8 backdrop-blur-2xl">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 lg:hidden hover:bg-white/10 shrink-0"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>
            
            {/* Breadcrumb / Title display */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="hidden sm:inline-block size-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent truncate">
                {portalLabel}
              </span>
              {profile?.universityName && (
                <span className="hidden md:inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-900/60 px-2.5 py-0.5 text-xs text-slate-300">
                  <GraduationCap className="size-3 text-cyan-400" />
                  {profile.universityName}
                </span>
              )}
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            
            {/* Live Wallet Pill (Student) */}
            {role === 'student' && (
              <Link
                to="/dashboard/wallet"
                className="group flex items-center gap-1.5 sm:gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-2.5 sm:px-3 py-1.5 transition-all hover:bg-emerald-950/40 hover:border-emerald-500/50 hover:scale-[1.02]"
                title="Quản lý ví và nạp tiền"
              >
                <div className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-slate-300 hidden sm:inline">Ví:</span>
                <span className="text-xs sm:text-sm font-bold text-emerald-400 tracking-tight">
                  {formatCurrency(walletBalance)}
                </span>
                <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 group-hover:bg-emerald-500 group-hover:text-black transition-colors">
                  <Plus className="size-3" />
                </span>
              </Link>
            )}

            {canSwitchWorkspace && (
              <Link
                to={switchTo}
                title={switchTitle}
                className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-all"
              >
                <ArrowLeftRight className="size-3.5" />
                <span className="hidden sm:inline">{switchLabel}</span>
              </Link>
            )}

            <LanguageSwitcher />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-3 sm:p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      <ScrollRestoration />
    </div>
  );
}
