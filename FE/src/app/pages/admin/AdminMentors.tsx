import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Loader2,
  ExternalLink,
  GraduationCap,
  BookOpen,
  Star,
  Clock,
  UserX,
  UserCheck,
  CheckCircle2,
  Lock,
  Unlock,
  RotateCcw,
  X,
  Languages,
  Video,
  Calendar,
  Building2,
  Award,
  Users,
  DollarSign,
  User,
  Filter,
  Phone,
  Mail,
  BadgeCheck,
  School,
  Hash,
} from 'lucide-react';
import { formatCurrency, type Mentor } from '../../data/mockData';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { StarRating, VerifiedBadge, StatusBadge } from '../../components/common';
import { toast } from 'sonner';
import { backendToMentor, type MentorProfileResponse } from '../../services/mentorService';
import {
  listAdminMentors,
  updateUserStatus,
  getAdminMentorScheduleOverview,
  type AdminMentorScheduleOverview,
} from '../../services/adminService';
import { useLanguage } from '../../context/LanguageContext';
import { formatDateTime } from '../../lib/format';
import { cn } from '../../components/ui/utils';

interface AdminMentorRow extends Mentor {
  userId: string;
  suspended: boolean;
  rawProfile?: MentorProfileResponse;
}

const toRow = (p: MentorProfileResponse): AdminMentorRow => ({
  ...backendToMentor(p),
  userId: p.userId,
  suspended: p.accountStatus === 'SUSPENDED',
  rawProfile: p,
});

const dayLabels: Record<string, { vi: string; en: string }> = {
  Monday: { vi: 'Thứ 2', en: 'Monday' },
  Tuesday: { vi: 'Thứ 3', en: 'Tuesday' },
  Wednesday: { vi: 'Thứ 4', en: 'Wednesday' },
  Thursday: { vi: 'Thứ 5', en: 'Thursday' },
  Friday: { vi: 'Thứ 6', en: 'Friday' },
  Saturday: { vi: 'Thứ 7', en: 'Saturday' },
  Sunday: { vi: 'Chủ nhật', en: 'Sunday' },
};

const bookingStatusConfig: Record<string, { labelVi: string; labelEn: string; color: string }> = {
  COMPLETED: { labelVi: 'Đã hoàn thành', labelEn: 'Completed', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  ESCROW_HELD: { labelVi: 'Sắp tới (Đã ký quỹ)', labelEn: 'Escrow Held', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  ACCEPTED: { labelVi: 'Đã chấp nhận', labelEn: 'Accepted', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  TAUGHT: { labelVi: 'Đã dạy (Chờ xác nhận)', labelEn: 'Taught (Pending Confirm)', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  PENDING_PAYMENT: { labelVi: 'Chờ thanh toán', labelEn: 'Pending Payment', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
  CANCELLED: { labelVi: 'Đã hủy', labelEn: 'Cancelled', color: 'bg-muted text-muted-foreground border-border' },
  DISPUTED: { labelVi: 'Khiếu nại', labelEn: 'Disputed', color: 'bg-destructive/10 text-destructive border-destructive/30' },
  DECLINED: { labelVi: 'Bị từ chối', labelEn: 'Declined', color: 'bg-destructive/10 text-destructive border-destructive/30' },
  REFUNDED: { labelVi: 'Đã hoàn tiền', labelEn: 'Refunded', color: 'bg-muted text-muted-foreground border-border' },
};

export function AdminMentors() {
  const { lang } = useLanguage();
  const vi = lang === 'vi';
  const [rows, setRows] = useState<AdminMentorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [verifyFilter, setVerifyFilter] = useState<'ALL' | 'VERIFIED' | 'UNVERIFIED'>('ALL');
  const [actingId, setActingId] = useState<string | null>(null);

  // Modal 1: Clean Mentor Profile
  const [profileSelected, setProfileSelected] = useState<AdminMentorRow | null>(null);

  // Modal 2: Independent Teaching Schedule & Mentees Overview
  const [scheduleSelected, setScheduleSelected] = useState<AdminMentorRow | null>(null);
  const [scheduleOverview, setScheduleOverview] = useState<AdminMentorScheduleOverview | null>(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [scheduleFilter, setScheduleFilter] = useState<'ALL' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [menteeSearch, setMenteeSearch] = useState('');

  useEffect(() => {
    listAdminMentors()
      .then((profiles) => setRows(profiles.map(toRow)))
      .catch(() => toast.error(vi ? 'Không tải được danh sách mentor.' : 'Failed to load mentors.'))
      .finally(() => setLoading(false));
  }, []);

  // Fetch Schedule Overview when scheduleSelected changes
  useEffect(() => {
    if (!scheduleSelected) {
      setScheduleOverview(null);
      setScheduleFilter('ALL');
      setMenteeSearch('');
      return;
    }

    setLoadingSchedule(true);
    getAdminMentorScheduleOverview(scheduleSelected.userId)
      .then(setScheduleOverview)
      .catch(() => toast.error(vi ? 'Không tải được tổng quan lịch dạy.' : 'Failed to load schedule overview.'))
      .finally(() => setLoadingSchedule(false));
  }, [scheduleSelected?.userId]);

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => !r.suspended).length;
    const suspended = rows.filter((r) => r.suspended).length;
    const verified = rows.filter((r) => r.verified).length;
    return { total, active, suspended, verified };
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((m) => {
      const q = query.trim().toLowerCase();
      const matchQ =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.university.toLowerCase().includes(q) ||
        m.major.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.courses.some((c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));

      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && !m.suspended) ||
        (statusFilter === 'SUSPENDED' && m.suspended);

      const matchVerify =
        verifyFilter === 'ALL' ||
        (verifyFilter === 'VERIFIED' && m.verified) ||
        (verifyFilter === 'UNVERIFIED' && !m.verified);

      return matchQ && matchStatus && matchVerify;
    });
  }, [rows, query, statusFilter, verifyFilter]);

  const isFiltered = query !== '' || statusFilter !== 'ALL' || verifyFilter !== 'ALL';

  const resetFilters = () => {
    setQuery('');
    setStatusFilter('ALL');
    setVerifyFilter('ALL');
  };

  const toggleSuspend = async (m: AdminMentorRow) => {
    const next = m.suspended ? 'ACTIVE' : 'SUSPENDED';
    setActingId(m.userId);
    try {
      await updateUserStatus(m.userId, next);
      setRows((prev) =>
        prev.map((r) => (r.userId === m.userId ? { ...r, suspended: next === 'SUSPENDED' } : r))
      );
      if (profileSelected && profileSelected.userId === m.userId) {
        setProfileSelected((prev) => (prev ? { ...prev, suspended: next === 'SUSPENDED' } : null));
      }
      if (scheduleSelected && scheduleSelected.userId === m.userId) {
        setScheduleSelected((prev) => (prev ? { ...prev, suspended: next === 'SUSPENDED' } : null));
      }
      toast.success(
        next === 'SUSPENDED'
          ? (vi ? `Đã tạm khoá ${m.name}. Mentor này không còn hiện với học viên.` : `${m.name} suspended and hidden from mentees.`)
          : (vi ? `Đã mở khoá ${m.name}.` : `${m.name} reactivated.`)
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? (vi ? 'Không thể cập nhật trạng thái mentor.' : 'Could not update mentor status.'));
    } finally {
      setActingId(null);
    }
  };

  // Filtered sessions in Schedule Overview Modal
  const filteredSessions = useMemo(() => {
    if (!scheduleOverview) return [];
    return scheduleOverview.sessions.filter((s) => {
      const q = menteeSearch.trim().toLowerCase();
      const m = s.mentee;
      const matchSearch =
        !q ||
        (m && m.fullName && m.fullName.toLowerCase().includes(q)) ||
        (m && m.studentId && m.studentId.toLowerCase().includes(q)) ||
        (m && m.email && m.email.toLowerCase().includes(q)) ||
        (m && m.phone && m.phone.toLowerCase().includes(q)) ||
        (m && m.major && m.major.toLowerCase().includes(q)) ||
        (s.courseCode && s.courseCode.toLowerCase().includes(q)) ||
        (s.id && s.id.toLowerCase().includes(q));

      let matchStatus = true;
      if (scheduleFilter === 'UPCOMING') {
        matchStatus = ['ESCROW_HELD', 'ACCEPTED', 'TAUGHT'].includes(s.status);
      } else if (scheduleFilter === 'COMPLETED') {
        matchStatus = s.status === 'COMPLETED';
      } else if (scheduleFilter === 'CANCELLED') {
        matchStatus = ['CANCELLED', 'DISPUTED', 'DECLINED', 'REFUNDED'].includes(s.status);
      }

      return matchSearch && matchStatus;
    });
  }, [scheduleOverview, menteeSearch, scheduleFilter]);

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{vi ? 'Quản lý Mentor' : 'Mentor Management'}</h1>
          <p className="mt-1 text-muted-foreground">{vi ? 'Xem hồ sơ, tổng quan lịch dạy và danh sách học viên của từng mentor.' : 'View mentor profiles, teaching schedule overviews, and detailed mentee records.'}</p>
        </div>
      </div>

      {/* KPI Overview Cards / Instant Filter Shortcuts */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => { setStatusFilter('ALL'); setVerifyFilter('ALL'); }}
          className={cn(
            'flex flex-col items-start rounded-2xl border p-4 text-left transition-all',
            statusFilter === 'ALL' && verifyFilter === 'ALL'
              ? 'border-primary/60 bg-primary/10 shadow-sm ring-1 ring-primary/40'
              : 'border-border bg-card/60 hover:border-border/80 hover:bg-card'
          )}
        >
          <div className="flex w-full items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">{vi ? 'Tổng Mentor' : 'Total Mentors'}</span>
            <GraduationCap className="size-4" />
          </div>
          <span className="mt-2 text-2xl font-bold">{stats.total}</span>
        </button>

        <button
          type="button"
          onClick={() => { setStatusFilter('ACTIVE'); }}
          className={cn(
            'flex flex-col items-start rounded-2xl border p-4 text-left transition-all',
            statusFilter === 'ACTIVE'
              ? 'border-emerald-500/60 bg-emerald-500/10 shadow-sm ring-1 ring-emerald-500/40'
              : 'border-border bg-card/60 hover:border-border/80 hover:bg-card'
          )}
        >
          <div className="flex w-full items-center justify-between text-emerald-500">
            <span className="text-xs font-medium">{vi ? 'Đang hoạt động' : 'Active'}</span>
            <UserCheck className="size-4" />
          </div>
          <span className="mt-2 text-2xl font-bold text-emerald-500">{stats.active}</span>
        </button>

        <button
          type="button"
          onClick={() => { setVerifyFilter('VERIFIED'); }}
          className={cn(
            'flex flex-col items-start rounded-2xl border p-4 text-left transition-all',
            verifyFilter === 'VERIFIED'
              ? 'border-blue-500/60 bg-blue-500/10 shadow-sm ring-1 ring-blue-500/40'
              : 'border-border bg-card/60 hover:border-border/80 hover:bg-card'
          )}
        >
          <div className="flex w-full items-center justify-between text-blue-400">
            <span className="text-xs font-medium">{vi ? 'Đã xác minh' : 'Verified'}</span>
            <CheckCircle2 className="size-4" />
          </div>
          <span className="mt-2 text-2xl font-bold text-blue-400">{stats.verified}</span>
        </button>

        <button
          type="button"
          onClick={() => { setStatusFilter('SUSPENDED'); }}
          className={cn(
            'flex flex-col items-start rounded-2xl border p-4 text-left transition-all',
            statusFilter === 'SUSPENDED'
              ? 'border-destructive/60 bg-destructive/10 shadow-sm ring-1 ring-destructive/40'
              : 'border-border bg-card/60 hover:border-border/80 hover:bg-card'
          )}
        >
          <div className="flex w-full items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">{vi ? 'Bị tạm khoá' : 'Suspended'}</span>
            <UserX className="size-4" />
          </div>
          <span className="mt-2 text-2xl font-bold text-muted-foreground">{stats.suspended}</span>
        </button>
      </div>

      <Card className="border-border p-6">
        {/* Toolbar: Search & Select Filters */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={vi ? 'Tìm theo tên, môn học, ngành, trường…' : 'Search by name, course, major, university…'}
              className="bg-input-background pl-9 pr-8"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <Select
            value={statusFilter}
            onValueChange={(val) => setStatusFilter(val as 'ALL' | 'ACTIVE' | 'SUSPENDED')}
          >
            <SelectTrigger className="w-full sm:w-36 text-xs sm:text-sm">
              <SelectValue placeholder={vi ? 'Trạng thái' : 'Status'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{vi ? 'Mọi trạng thái' : 'All Status'}</SelectItem>
              <SelectItem value="ACTIVE">{vi ? 'Hoạt động' : 'Active'}</SelectItem>
              <SelectItem value="SUSPENDED">{vi ? 'Bị khoá' : 'Suspended'}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={verifyFilter}
            onValueChange={(val) => setVerifyFilter(val as 'ALL' | 'VERIFIED' | 'UNVERIFIED')}
          >
            <SelectTrigger className="w-full sm:w-40 text-xs sm:text-sm">
              <SelectValue placeholder={vi ? 'Xác minh' : 'Verification'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{vi ? 'Mọi xác minh' : 'All Verification'}</SelectItem>
              <SelectItem value="VERIFIED">{vi ? 'Đã xác minh' : 'Verified'}</SelectItem>
              <SelectItem value="UNVERIFIED">{vi ? 'Chưa xác minh' : 'Unverified'}</SelectItem>
            </SelectContent>
          </Select>

          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
              title={vi ? 'Đặt lại bộ lọc' : 'Reset filters'}
            >
              <RotateCcw className="size-3.5 mr-1" />
              {vi ? 'Xóa lọc' : 'Reset'}
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="size-5 animate-spin" /> {vi ? 'Đang tải mentor…' : 'Loading mentors…'}
          </div>
        ) : filtered.length ? (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {filtered.length} {vi ? 'mentor' : 'mentors'}
            </p>
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <Table className="min-w-[950px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[240px] pl-4">Mentor</TableHead>
                    <TableHead className="min-w-[200px]">{vi ? 'Ngành' : 'Major'}</TableHead>
                    <TableHead className="min-w-[130px]">{vi ? 'Xác minh' : 'Verification'}</TableHead>
                    <TableHead className="min-w-[110px]">{vi ? 'Đánh giá' : 'Rating'}</TableHead>
                    <TableHead className="min-w-[110px]">{vi ? 'Trạng thái' : 'Status'}</TableHead>
                    <TableHead className="min-w-[290px] text-right pr-4">{vi ? 'Thao tác' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => (
                    <TableRow key={m.userId} className="hover:bg-muted/30">
                      <TableCell className="min-w-[240px] pl-4">
                        <button
                          type="button"
                          onClick={() => setProfileSelected(m)}
                          className="flex items-center gap-3 text-left group w-full"
                          title={vi ? 'Bấm để xem hồ sơ chuyên môn' : 'Click to view profile'}
                        >
                          <ImageWithFallback
                            src={m.avatar}
                            alt={m.name}
                            className="size-10 rounded-xl object-cover ring-1 ring-border group-hover:ring-primary shrink-0 transition-all"
                          />
                          <div className="min-w-0 flex-1">
                            <p style={{ fontWeight: 600 }} className="text-foreground group-hover:text-primary transition-colors truncate">
                              {m.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{m.role}</p>
                          </div>
                        </button>
                      </TableCell>
                      <TableCell className="min-w-[200px] text-muted-foreground">
                        <span className="truncate block max-w-[190px]">{m.major || '—'}</span>
                      </TableCell>
                      <TableCell className="min-w-[130px]"><VerifiedBadge verified={m.verified} /></TableCell>
                      <TableCell className="min-w-[110px]"><StarRating rating={m.rating} /></TableCell>
                      <TableCell className="min-w-[110px]"><StatusBadge status={m.suspended ? 'Suspended' : 'Active'} /></TableCell>
                      <TableCell className="min-w-[290px] text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Button 1: Profile */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setProfileSelected(m)}
                            className="gap-1 text-xs"
                            title={vi ? 'Xem hồ sơ chuyên môn' : 'View profile'}
                          >
                            <User className="size-3.5" />
                            {vi ? 'Hồ sơ' : 'Profile'}
                          </Button>

                          {/* Button 2: Schedule & Mentees Overview */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setScheduleSelected(m)}
                            className="gap-1 text-xs text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
                            title={vi ? 'Xem tổng quan lịch dạy & danh sách học viên' : 'View schedule & mentees'}
                          >
                            <Calendar className="size-3.5" />
                            {vi ? 'Tổng quan lịch dạy' : 'Schedule'}
                          </Button>

                          {/* Button 3: Suspend / Unlock */}
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn('text-xs', m.suspended ? 'text-success border-success/30 hover:bg-success/10' : 'text-danger border-danger/30 hover:bg-danger/10')}
                            disabled={actingId === m.userId}
                            onClick={() => toggleSuspend(m)}
                          >
                            {actingId === m.userId
                              ? <Loader2 className="size-3.5 animate-spin" />
                              : m.suspended ? (vi ? 'Mở khoá' : 'Unlock') : (vi ? 'Tạm khoá' : 'Suspend')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-14 text-center text-muted-foreground">
            <p className="font-medium">{vi ? 'Không tìm thấy mentor nào phù hợp.' : 'No mentors match the selected criteria.'}</p>
            {isFiltered && (
              <Button variant="outline" size="sm" onClick={resetFilters} className="mt-3 text-xs">
                <RotateCcw className="size-3.5 mr-1.5" />
                {vi ? 'Đặt lại bộ lọc' : 'Reset filters'}
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* ========================================================================= */}
      {/* MODAL 1: MENTOR PROFILE DETAILS (WIDE 2-COLUMN LAYOUT) */}
      {/* ========================================================================= */}
      {profileSelected && (
        <Dialog open={!!profileSelected} onOpenChange={() => setProfileSelected(null)}>
          <DialogContent className="w-[94vw] max-w-6xl sm:max-w-6xl max-h-[92vh] overflow-y-auto" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="size-5 text-primary" />
                {vi ? 'Hồ sơ chuyên môn Mentor' : 'Mentor Profile'}
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
              {/* LEFT COLUMN: IDENTITY, METRICS, BIO, SKILLS & AVAILABILITY (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                {/* Header Profile Card */}
                <div className="rounded-2xl border border-border bg-card/60 p-4 space-y-3">
                  <div className="flex items-start gap-3.5">
                    <ImageWithFallback
                      src={profileSelected.avatar}
                      alt={profileSelected.name}
                      className="size-16 rounded-2xl object-cover ring-2 ring-primary/20 shrink-0"
                    />
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="text-base font-bold truncate">{profileSelected.name}</h3>
                        <VerifiedBadge verified={profileSelected.verified} />
                        <StatusBadge status={profileSelected.suspended ? 'Suspended' : 'Active'} />
                      </div>
                      <p className="text-xs font-medium text-primary">{profileSelected.role}</p>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {profileSelected.university && (
                          <div className="flex items-center gap-1">
                            <Building2 className="size-3 shrink-0" />
                            <span className="truncate">{profileSelected.university}</span>
                          </div>
                        )}
                        {profileSelected.major && (
                          <div className="truncate">• {profileSelected.major}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/50 pt-2 text-[11px] text-muted-foreground font-mono">
                    <span>ID: {profileSelected.id.slice(0, 12)}…</span>
                    <span>User: {profileSelected.userId.slice(0, 12)}…</span>
                  </div>
                </div>

                {/* 4 Quick Metrics Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-border bg-card/40 p-3">
                    <div className="flex items-center justify-between text-muted-foreground text-xs">
                      <span>{vi ? 'Đánh giá' : 'Rating'}</span>
                      <Star className="size-3.5 text-amber-400 fill-amber-400" />
                    </div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-xl font-bold">{profileSelected.rating ? profileSelected.rating.toFixed(1) : '0.0'}</span>
                      <span className="text-xs text-muted-foreground">({profileSelected.reviewsCount})</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-card/40 p-3">
                    <div className="flex items-center justify-between text-muted-foreground text-xs">
                      <span>{vi ? 'Buổi hoàn thành' : 'Sessions'}</span>
                      <Clock className="size-3.5 text-emerald-400" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-emerald-400">
                      {profileSelected.sessionsCompleted}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-card/40 p-3">
                    <div className="flex items-center justify-between text-muted-foreground text-xs">
                      <span>{vi ? 'Học phí 1-1' : '1-on-1 Rate'}</span>
                      <span className="text-[10px] text-muted-foreground">/h</span>
                    </div>
                    <div className="mt-1 text-base font-bold text-primary truncate" title={formatCurrency(profileSelected.hourlyRate)}>
                      {profileSelected.hourlyRate ? formatCurrency(profileSelected.hourlyRate) : '—'}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-card/40 p-3">
                    <div className="flex items-center justify-between text-muted-foreground text-xs">
                      <span>{vi ? 'Học phí nhóm' : 'Group Rate'}</span>
                      <span className="text-[10px] text-muted-foreground">/h</span>
                    </div>
                    <div className="mt-1 text-base font-bold text-primary truncate" title={formatCurrency(profileSelected.groupRate)}>
                      {profileSelected.groupRate ? formatCurrency(profileSelected.groupRate) : '—'}
                    </div>
                  </div>
                </div>

                {/* Bio / About */}
                <div className="rounded-xl border border-border p-3.5 space-y-1.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {vi ? 'Giới thiệu bản thân' : 'About / Biography'}
                  </h4>
                  <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                    {profileSelected.about?.trim() || (vi ? 'Chưa cập nhật phần giới thiệu bản thân.' : 'No biography provided.')}
                  </p>
                </div>

                {/* Skills & Formats & Languages */}
                <div className="rounded-xl border border-border p-3.5 space-y-3">
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Award className="size-3.5" />
                      {vi ? 'Kỹ năng & Chuyên môn' : 'Expertise & Skills'}
                    </h4>
                    {profileSelected.expertise && profileSelected.expertise.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {profileSelected.expertise.map((s, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">{vi ? 'Chưa cập nhật' : 'None specified'}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-xs">
                    <div>
                      <span className="font-semibold text-muted-foreground flex items-center gap-1 mb-0.5">
                        <Languages className="size-3" />
                        {vi ? 'Ngôn ngữ' : 'Languages'}
                      </span>
                      <span className="text-foreground">
                        {profileSelected.languages && profileSelected.languages.length > 0
                          ? profileSelected.languages.join(', ')
                          : (vi ? 'Tiếng Việt' : 'Vietnamese')}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-muted-foreground flex items-center gap-1 mb-0.5">
                        <Video className="size-3" />
                        {vi ? 'Hình thức dạy' : 'Formats'}
                      </span>
                      <span className="text-foreground">
                        {profileSelected.formats && profileSelected.formats.length > 0
                          ? profileSelected.formats.join(', ')
                          : 'Online, Offline'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Weekly Availability */}
                {profileSelected.availability && Object.keys(profileSelected.availability).length > 0 && (
                  <div className="rounded-xl border border-border p-3.5 space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="size-3.5" />
                      {vi ? 'Khung giờ rảnh trong tuần' : 'Weekly Availability'}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {Object.entries(profileSelected.availability).map(([day, slots]) => (
                        <div key={day} className="flex items-center justify-between rounded-lg bg-muted/30 px-2.5 py-1.5">
                          <span className="font-medium text-foreground">
                            {dayLabels[day] ? (vi ? dayLabels[day].vi : dayLabels[day].en) : day}:
                          </span>
                          <span className="text-muted-foreground">
                            {Array.isArray(slots) ? slots.join(', ') : String(slots)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: SPACIOUS COURSES TABLE & ACTIONS (7 cols) */}
              <div className="lg:col-span-7 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                      <BookOpen className="size-4 text-primary" />
                      {vi ? 'Danh sách môn học giảng dạy' : 'Courses Taught'} ({profileSelected.courses?.length || 0})
                    </h4>
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      {profileSelected.courses?.filter(c => c.verified).length || 0} {vi ? 'môn đã duyệt' : 'verified'}
                    </Badge>
                  </div>

                  {profileSelected.courses && profileSelected.courses.length > 0 ? (
                    <div className="rounded-xl border border-border overflow-hidden bg-card/40">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/60 text-muted-foreground border-b border-border">
                          <tr>
                            <th className="py-3 px-3.5 text-left font-semibold">{vi ? 'Mã môn' : 'Code'}</th>
                            <th className="py-3 px-3.5 text-left font-semibold">{vi ? 'Tên môn học' : 'Course Name'}</th>
                            <th className="py-3 px-3 text-center font-semibold">{vi ? 'Điểm' : 'Grade'}</th>
                            <th className="py-3 px-3.5 text-right font-semibold">{vi ? 'Học phí 1-1' : '1-on-1 Rate'}</th>
                            <th className="py-3 px-3.5 text-right font-semibold">{vi ? 'Học phí nhóm' : 'Group Rate'}</th>
                            <th className="py-3 px-3.5 text-center font-semibold">{vi ? 'Xác minh' : 'Status'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {profileSelected.courses.map((c, i) => (
                            <tr key={c.code + i} className="hover:bg-muted/30 transition-colors">
                              <td className="py-2.5 px-3.5 font-bold font-mono text-primary text-xs">
                                <span className="bg-primary/10 px-2 py-0.5 rounded">
                                  {c.code}
                                </span>
                              </td>
                              <td className="py-2.5 px-3.5 text-foreground font-semibold">
                                {c.name || c.code}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {c.grade ? (
                                  <span className="rounded bg-primary/15 px-2 py-0.5 font-bold text-primary text-xs">
                                    {c.grade}
                                  </span>
                                ) : '—'}
                              </td>
                              <td className="py-2.5 px-3.5 text-right font-bold text-foreground">
                                {c.ratePrivate ? `${formatCurrency(c.ratePrivate)}/h` : '—'}
                              </td>
                              <td className="py-2.5 px-3.5 text-right font-bold text-foreground">
                                {c.rateGroup ? `${formatCurrency(c.rateGroup)}/h` : '—'}
                              </td>
                              <td className="py-2.5 px-3.5 text-center">
                                {c.verified ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-xs">
                                    <CheckCircle2 className="size-3.5" /> {vi ? 'Đã duyệt' : 'Verified'}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                                    <Clock className="size-3.5" /> {vi ? 'Chờ duyệt' : 'Pending'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground rounded-xl border border-dashed border-border p-6">
                      <BookOpen className="size-8 opacity-30 mb-2" />
                      <p className="text-xs font-medium">
                        {vi ? 'Mentor chưa đăng ký môn học nào.' : 'No courses registered by this mentor.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Quick Shortcuts Box in Right Column */}
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/15 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="size-5 text-cyan-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        {vi ? 'Lịch dạy & Danh sách học viên' : 'Schedule & Mentees Overview'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {vi ? 'Xem toàn bộ ca dạy, MSSV, trường, ngành, niên khóa và liên hệ của từng học viên.' : 'View all sessions, student IDs, majors, and contact details of mentees.'}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      const target = profileSelected;
                      setProfileSelected(null);
                      setScheduleSelected(target);
                    }}
                    className="gap-1.5 text-xs bg-cyan-600 hover:bg-cyan-500 text-white shrink-0"
                  >
                    <Calendar className="size-3.5" />
                    {vi ? 'Mở lịch dạy & Học viên' : 'Open Schedule'}
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-border pt-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/mentors/${profileSelected.id}`, '_blank')}
                  className="gap-1.5 text-xs text-primary hover:text-primary"
                >
                  <ExternalLink className="size-3.5" />
                  {vi ? 'Mở trang công khai' : 'Open Public Page'}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={profileSelected.suspended ? 'default' : 'destructive'}
                  size="sm"
                  disabled={actingId === profileSelected.userId}
                  onClick={() => toggleSuspend(profileSelected)}
                  className="gap-1.5 text-xs"
                >
                  {actingId === profileSelected.userId ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : profileSelected.suspended ? (
                    <Unlock className="size-3.5" />
                  ) : (
                    <Lock className="size-3.5" />
                  )}
                  {profileSelected.suspended
                    ? (vi ? 'Mở khoá tài khoản' : 'Unlock Account')
                    : (vi ? 'Tạm khoá tài khoản' : 'Suspend Account')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setProfileSelected(null)} className="text-xs">
                  {vi ? 'Đóng' : 'Close'}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TEACHING SCHEDULE & FULL MENTEE OVERVIEW (ULTRA-WIDE 2-COLUMN GRID) */}
      {/* ========================================================================= */}
      {scheduleSelected && (
        <Dialog open={!!scheduleSelected} onOpenChange={() => setScheduleSelected(null)}>
          <DialogContent className="w-[95vw] max-w-7xl sm:max-w-7xl max-h-[92vh] overflow-y-auto" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="size-5 text-cyan-400" />
                {vi ? 'Tổng quan Lịch dạy & Danh sách Học viên' : 'Teaching Schedule & Mentees Overview'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/* Mentor Summary Banner */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-4">
                <div className="flex items-center gap-3">
                  <ImageWithFallback
                    src={scheduleSelected.avatar}
                    alt={scheduleSelected.name}
                    className="size-14 rounded-2xl object-cover ring-2 ring-cyan-500/30 shrink-0"
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-foreground">{scheduleSelected.name}</h3>
                      <VerifiedBadge verified={scheduleSelected.verified} />
                      <StatusBadge status={scheduleSelected.suspended ? 'Suspended' : 'Active'} />
                    </div>
                    <p className="text-xs font-medium text-cyan-400 mt-0.5">{scheduleSelected.role}</p>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {scheduleSelected.university} {scheduleSelected.major && `• ${scheduleSelected.major}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const target = scheduleSelected;
                      setScheduleSelected(null);
                      setProfileSelected(target);
                    }}
                    className="gap-1.5 text-xs border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-400"
                  >
                    <User className="size-3.5" />
                    {vi ? 'Xem hồ sơ mentor' : 'View Profile'}
                  </Button>
                </div>
              </div>

              {/* 4 KPI Overview Metric Cards */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <div className="rounded-xl border border-border bg-card/60 p-3">
                  <div className="flex items-center justify-between text-muted-foreground text-xs">
                    <span>{vi ? 'Tổng buổi dạy' : 'Total Sessions'}</span>
                    <BookOpen className="size-4 text-primary" />
                  </div>
                  <div className="mt-1 text-2xl font-bold text-foreground">
                    {scheduleOverview?.totalSessions ?? 0}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card/60 p-3">
                  <div className="flex items-center justify-between text-muted-foreground text-xs">
                    <span>{vi ? 'Học viên đã học' : 'Unique Mentees'}</span>
                    <Users className="size-4 text-blue-400" />
                  </div>
                  <div className="mt-1 text-2xl font-bold text-blue-400">
                    {scheduleOverview?.uniqueMenteesCount ?? 0}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card/60 p-3">
                  <div className="flex items-center justify-between text-muted-foreground text-xs">
                    <span>{vi ? 'Doanh thu hoàn tất' : 'Completed Revenue'}</span>
                    <DollarSign className="size-4 text-emerald-400" />
                  </div>
                  <div className="mt-1 text-xl font-bold text-emerald-400 truncate" title={formatCurrency(scheduleOverview?.totalRevenue ?? 0)}>
                    {formatCurrency(scheduleOverview?.totalRevenue ?? 0)}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card/60 p-3">
                  <div className="flex items-center justify-between text-muted-foreground text-xs">
                    <span>{vi ? 'Sắp diễn ra' : 'Upcoming'}</span>
                    <Clock className="size-4 text-amber-400" />
                  </div>
                  <div className="mt-1 text-2xl font-bold text-amber-400">
                    {scheduleOverview?.upcomingCount ?? 0}
                  </div>
                </div>
              </div>

              {/* Filter Toolbar for Schedule */}
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between pt-1">
                {/* Status Tabs */}
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    variant={scheduleFilter === 'ALL' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setScheduleFilter('ALL')}
                    className="h-8 text-xs"
                  >
                    {vi ? 'Tất cả' : 'All'} ({scheduleOverview?.totalSessions ?? 0})
                  </Button>
                  <Button
                    type="button"
                    variant={scheduleFilter === 'UPCOMING' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setScheduleFilter('UPCOMING')}
                    className="h-8 text-xs text-amber-400"
                  >
                    {vi ? 'Sắp tới' : 'Upcoming'} ({scheduleOverview?.upcomingCount ?? 0})
                  </Button>
                  <Button
                    type="button"
                    variant={scheduleFilter === 'COMPLETED' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setScheduleFilter('COMPLETED')}
                    className="h-8 text-xs text-emerald-400"
                  >
                    {vi ? 'Đã hoàn thành' : 'Completed'} ({scheduleOverview?.completedCount ?? 0})
                  </Button>
                  <Button
                    type="button"
                    variant={scheduleFilter === 'CANCELLED' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setScheduleFilter('CANCELLED')}
                    className="h-8 text-xs text-muted-foreground"
                  >
                    {vi ? 'Đã hủy / Khiếu nại' : 'Cancelled'} ({scheduleOverview?.cancelledCount ?? 0})
                  </Button>
                </div>

                {/* Search input for mentee name, MSSV, email, course */}
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={menteeSearch}
                    onChange={(e) => setMenteeSearch(e.target.value)}
                    placeholder={vi ? 'Tìm tên, MSSV, email, SĐT, môn…' : 'Search name, student ID, email, phone…'}
                    className="bg-input-background pl-8 pr-7 h-8 text-xs"
                  />
                  {menteeSearch && (
                    <button
                      type="button"
                      onClick={() => setMenteeSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Sessions List with Full Mentee Profiles (2-COLUMN RESPONSIVE GRID) */}
              {loadingSchedule ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                  <Loader2 className="size-5 animate-spin" />
                  <span className="text-xs">{vi ? 'Đang tải lịch dạy và toàn bộ hồ sơ học viên…' : 'Loading schedule and full mentee records…'}</span>
                </div>
              ) : filteredSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center text-muted-foreground rounded-2xl border border-dashed border-border p-8">
                  <Filter className="size-9 opacity-30 mb-2" />
                  <p className="text-sm font-medium">
                    {scheduleOverview?.sessions.length === 0
                      ? (vi ? 'Mentor này chưa có buổi dạy hoặc học viên nào trên hệ thống.' : 'No teaching sessions or mentees recorded for this mentor.')
                      : (vi ? 'Không có buổi học nào khớp với bộ lọc tìm kiếm.' : 'No sessions match your filter criteria.')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 max-h-[580px] overflow-y-auto pr-1">
                  {filteredSessions.map((s) => {
                    const statusConf = bookingStatusConfig[s.status] ?? {
                      labelVi: s.status,
                      labelEn: s.status,
                      color: 'bg-muted text-muted-foreground border-border',
                    };
                    const mentee = s.mentee;

                    return (
                      <div
                        key={s.id}
                        className="rounded-2xl border border-border bg-card/60 p-4 hover:border-cyan-500/40 hover:bg-card/90 transition-all flex flex-col justify-between gap-3 shadow-xs"
                      >
                        {/* Upper Section: Mentee Profile Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <ImageWithFallback
                              src={mentee?.avatarUrl ?? ''}
                              alt={mentee?.fullName ?? 'Mentee'}
                              className="size-14 rounded-2xl object-cover ring-2 ring-primary/20 shrink-0 mt-0.5"
                            />
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-bold text-base text-foreground truncate">
                                  {mentee?.fullName || (vi ? 'Học viên ẩn danh' : 'Unknown Mentee')}
                                </span>
                                {mentee?.status && (
                                  <StatusBadge status={mentee.status === 'ACTIVE' ? 'Active' : 'Suspended'} />
                                )}
                                {mentee?.totalSessionsWithMentor && mentee.totalSessionsWithMentor > 1 && (
                                  <span className="rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold">
                                    {vi ? `Đã học ${mentee.totalSessionsWithMentor} buổi` : `${mentee.totalSessionsWithMentor} sessions`}
                                  </span>
                                )}
                              </div>

                              {/* Academic Details: MSSV, Major, University, Academic Year */}
                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
                                {mentee?.studentId ? (
                                  <span className="flex items-center gap-1 font-bold text-foreground bg-primary/10 text-primary px-2 py-0.5 rounded">
                                    <Hash className="size-3" />
                                    {vi ? 'MSSV' : 'ID'}: {mentee.studentId}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/70 italic text-[11px]">{vi ? 'Chưa có MSSV' : 'No Student ID'}</span>
                                )}

                                {mentee?.major && (
                                  <span className="flex items-center gap-1 text-foreground">
                                    <BookOpen className="size-3 text-muted-foreground shrink-0" />
                                    <span className="truncate max-w-[150px]">{mentee.major}</span>
                                  </span>
                                )}

                                {mentee?.universityName && (
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <School className="size-3 shrink-0" />
                                    <span className="truncate max-w-[160px]">{mentee.universityName}</span>
                                  </span>
                                )}

                                {mentee?.year && (
                                  <span className="rounded bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                                    {mentee.year}
                                  </span>
                                )}
                              </div>

                              {/* Contact Details: Email, School Email, Phone */}
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground pt-0.5">
                                {mentee?.email && (
                                  <span className="flex items-center gap-1 text-foreground/90" title={mentee.email}>
                                    <Mail className="size-3 text-muted-foreground shrink-0" />
                                    <span className="truncate max-w-[180px]">{mentee.email}</span>
                                  </span>
                                )}

                                {mentee?.schoolEmail && (
                                  <span className="flex items-center gap-1 text-foreground/90" title={mentee.schoolEmail}>
                                    <BadgeCheck className={cn('size-3.5 shrink-0', mentee.schoolVerified ? 'text-blue-400' : 'text-muted-foreground')} />
                                    <span className="truncate max-w-[180px]">{mentee.schoolEmail}</span>
                                  </span>
                                )}

                                {mentee?.phone && (
                                  <span className="flex items-center gap-1 text-foreground/90">
                                    <Phone className="size-3 text-muted-foreground shrink-0" />
                                    <span>{mentee.phone}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Price & Status Badge */}
                          <div className="flex flex-col items-end justify-between gap-1.5 shrink-0">
                            <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', statusConf.color)}>
                              {vi ? statusConf.labelVi : statusConf.labelEn}
                            </span>
                            <span className="text-base font-extrabold text-foreground">
                              {formatCurrency(s.price)}
                            </span>
                          </div>
                        </div>

                        {/* Lower Section: Session Schedule Specs */}
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/40 px-3.5 py-2 text-xs text-muted-foreground border border-border/50">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="font-mono font-bold text-primary bg-primary/15 px-2 py-0.5 rounded text-[11px]">
                              {s.courseCode}
                            </span>
                            <span className="flex items-center gap-1.5 text-foreground font-semibold">
                              <Calendar className="size-3.5 text-cyan-400" />
                              {formatDateTime(s.startAt, lang)}
                            </span>
                            <span>• {s.durationMin} {vi ? 'phút' : 'min'}</span>
                            <span className="font-medium text-foreground">
                              • {s.format === 'ONE_ON_ONE' ? (vi ? '1 kèm 1' : '1-on-1') : (vi ? 'Học nhóm' : 'Group')}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                            {s.roomId && <span className="text-cyan-400">Room: {s.roomId.slice(0, 10)}…</span>}
                            <span className="opacity-70">ID: {s.id.slice(0, 8)}…</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <DialogFooter className="mt-4 border-t border-border pt-4">
              <Button variant="ghost" size="sm" onClick={() => setScheduleSelected(null)} className="text-xs">
                {vi ? 'Đóng' : 'Close'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
