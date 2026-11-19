import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Loader2,
  Eye,
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
  Tabs, TabsList, TabsTrigger,
} from '../../components/ui/tabs';
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
import { listAdminMentors, updateUserStatus, getAdminMentorBookings } from '../../services/adminService';
import type { BookingResponse } from '../../services/bookingService';
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
  const [selected, setSelected] = useState<AdminMentorRow | null>(null);

  // Modal State
  const [modalTab, setModalTab] = useState<'profile' | 'schedule'>('profile');
  const [mentorBookings, setMentorBookings] = useState<BookingResponse[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingFilter, setBookingFilter] = useState<'ALL' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [bookingSearch, setBookingSearch] = useState('');

  useEffect(() => {
    listAdminMentors()
      .then((profiles) => setRows(profiles.map(toRow)))
      .catch(() => toast.error(vi ? 'Không tải được danh sách mentor.' : 'Failed to load mentors.'))
      .finally(() => setLoading(false));
  }, []);

  // Fetch bookings when selected mentor changes
  useEffect(() => {
    if (!selected) {
      setMentorBookings([]);
      setModalTab('profile');
      setBookingFilter('ALL');
      setBookingSearch('');
      return;
    }

    setLoadingBookings(true);
    getAdminMentorBookings(selected.userId)
      .then(setMentorBookings)
      .catch(() => toast.error(vi ? 'Không tải được lịch dạy của mentor.' : 'Failed to load mentor schedule.'))
      .finally(() => setLoadingBookings(false));
  }, [selected?.userId]);

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

  // Suspend hides the mentor from mentees (listing, profile, booking) and blocks their login; unlock restores it.
  const toggleSuspend = async (m: AdminMentorRow) => {
    const next = m.suspended ? 'ACTIVE' : 'SUSPENDED';
    setActingId(m.userId);
    try {
      await updateUserStatus(m.userId, next);
      setRows((prev) =>
        prev.map((r) => (r.userId === m.userId ? { ...r, suspended: next === 'SUSPENDED' } : r))
      );
      if (selected && selected.userId === m.userId) {
        setSelected((prev) => (prev ? { ...prev, suspended: next === 'SUSPENDED' } : null));
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

  // Schedule & Mentee stats for selected mentor
  const mentorBookingStats = useMemo(() => {
    const total = mentorBookings.length;
    const uniqueMentees = new Set(mentorBookings.map((b) => b.menteeId).filter(Boolean)).size;
    const completed = mentorBookings.filter((b) => b.status === 'COMPLETED').length;
    const upcoming = mentorBookings.filter((b) => ['ESCROW_HELD', 'ACCEPTED', 'TAUGHT'].includes(b.status)).length;
    const cancelled = mentorBookings.filter((b) => ['CANCELLED', 'DISPUTED', 'DECLINED', 'REFUNDED'].includes(b.status)).length;
    const revenue = mentorBookings
      .filter((b) => b.status === 'COMPLETED')
      .reduce((sum, b) => sum + (b.price || 0), 0);
    return { total, uniqueMentees, completed, upcoming, cancelled, revenue };
  }, [mentorBookings]);

  // Filtered bookings in modal
  const filteredBookings = useMemo(() => {
    return mentorBookings.filter((b) => {
      const q = bookingSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        (b.menteeName && b.menteeName.toLowerCase().includes(q)) ||
        (b.menteeEmail && b.menteeEmail.toLowerCase().includes(q)) ||
        (b.courseCode && b.courseCode.toLowerCase().includes(q)) ||
        (b.id && b.id.toLowerCase().includes(q));

      let matchStatus = true;
      if (bookingFilter === 'UPCOMING') {
        matchStatus = ['ESCROW_HELD', 'ACCEPTED', 'TAUGHT'].includes(b.status);
      } else if (bookingFilter === 'COMPLETED') {
        matchStatus = b.status === 'COMPLETED';
      } else if (bookingFilter === 'CANCELLED') {
        matchStatus = ['CANCELLED', 'DISPUTED', 'DECLINED', 'REFUNDED'].includes(b.status);
      }

      return matchSearch && matchStatus;
    });
  }, [mentorBookings, bookingSearch, bookingFilter]);

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{vi ? 'Quản lý Mentor' : 'Mentor Management'}</h1>
          <p className="mt-1 text-muted-foreground">{vi ? 'Xem, tìm kiếm và quản lý chi tiết tất cả mentor trên hệ thống.' : 'View, search, and manage detailed profiles of all platform mentors.'}</p>
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mentor</TableHead>
                    <TableHead>{vi ? 'Ngành' : 'Major'}</TableHead>
                    <TableHead>{vi ? 'Xác minh' : 'Verification'}</TableHead>
                    <TableHead>{vi ? 'Đánh giá' : 'Rating'}</TableHead>
                    <TableHead>{vi ? 'Buổi học' : 'Sessions'}</TableHead>
                    <TableHead>{vi ? 'Học phí' : 'Rate'}</TableHead>
                    <TableHead>{vi ? 'Trạng thái' : 'Status'}</TableHead>
                    <TableHead className="text-right">{vi ? 'Thao tác' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => (
                    <TableRow key={m.userId} className="hover:bg-muted/30">
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => setSelected(m)}
                          className="flex items-center gap-2.5 text-left group"
                          title={vi ? 'Bấm để xem chi tiết hồ sơ & lịch dạy' : 'Click to view profile & schedule'}
                        >
                          <ImageWithFallback
                            src={m.avatar}
                            alt={m.name}
                            className="size-9 rounded-xl object-cover ring-1 ring-border group-hover:ring-primary transition-all"
                          />
                          <div>
                            <p style={{ fontWeight: 500 }} className="group-hover:text-primary transition-colors">
                              {m.name}
                            </p>
                            <p className="text-xs text-muted-foreground">{m.role}</p>
                          </div>
                        </button>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{m.major || '—'}</TableCell>
                      <TableCell><VerifiedBadge verified={m.verified} /></TableCell>
                      <TableCell><StarRating rating={m.rating} /></TableCell>
                      <TableCell className="text-muted-foreground">{m.sessionsCompleted}</TableCell>
                      <TableCell style={{ fontWeight: 500 }}>
                        {m.hourlyRate ? `${formatCurrency(m.hourlyRate)}/${vi ? 'giờ' : 'hr'}` : '—'}
                      </TableCell>
                      <TableCell><StatusBadge status={m.suspended ? 'Suspended' : 'Active'} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelected(m)}
                            className="gap-1 text-xs"
                            title={vi ? 'Xem chi tiết profile & lịch dạy' : 'View profile & schedule'}
                          >
                            <Eye className="size-3.5" />
                            {vi ? 'Chi tiết' : 'Details'}
                          </Button>
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

      {/* Mentor Profile & Schedule Detail Dialog */}
      {selected && (
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GraduationCap className="size-5 text-primary" />
                {vi ? 'Chi tiết Mentor & Lịch giảng dạy' : 'Mentor Profile & Teaching Schedule'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5 pt-2">
              {/* Header Profile Section */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border bg-card/60 p-4">
                <div className="flex items-center gap-3.5">
                  <ImageWithFallback
                    src={selected.avatar}
                    alt={selected.name}
                    className="size-16 rounded-2xl object-cover ring-2 ring-primary/20"
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold">{selected.name}</h3>
                      <VerifiedBadge verified={selected.verified} />
                      <StatusBadge status={selected.suspended ? 'Suspended' : 'Active'} />
                    </div>
                    <p className="text-sm font-medium text-primary mt-0.5">{selected.role}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {selected.university && (
                        <span className="flex items-center gap-1">
                          <Building2 className="size-3" />
                          {selected.university}
                        </span>
                      )}
                      {selected.major && (
                        <span>• {selected.major}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-start sm:items-end text-xs text-muted-foreground font-mono">
                  <span>ID: {selected.id}</span>
                  <span>User: {selected.userId}</span>
                </div>
              </div>

              {/* Navigation Tabs between Profile and Schedule */}
              <Tabs value={modalTab} onValueChange={(v) => setModalTab(v as 'profile' | 'schedule')} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-muted/60 p-1">
                  <TabsTrigger value="profile" className="gap-2 text-xs sm:text-sm">
                    <User className="size-4" />
                    {vi ? 'Hồ sơ & Môn học' : 'Profile & Courses'}
                  </TabsTrigger>
                  <TabsTrigger value="schedule" className="gap-2 text-xs sm:text-sm">
                    <Calendar className="size-4" />
                    {vi ? 'Lịch dạy & Học viên' : 'Schedule & Mentees'}
                    {mentorBookings.length > 0 && (
                      <span className="ml-1 rounded-full bg-primary/20 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                        {mentorBookings.length}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* TAB 1: PROFILE & COURSES */}
              {modalTab === 'profile' && (
                <div className="space-y-4">
                  {/* Quick Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    <div className="rounded-xl border border-border bg-card/40 p-3">
                      <div className="flex items-center justify-between text-muted-foreground text-xs">
                        <span>{vi ? 'Đánh giá' : 'Rating'}</span>
                        <Star className="size-3.5 text-amber-400 fill-amber-400" />
                      </div>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-xl font-bold">{selected.rating ? selected.rating.toFixed(1) : '0.0'}</span>
                        <span className="text-xs text-muted-foreground">({selected.reviewsCount})</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card/40 p-3">
                      <div className="flex items-center justify-between text-muted-foreground text-xs">
                        <span>{vi ? 'Buổi hoàn thành' : 'Sessions'}</span>
                        <Clock className="size-3.5 text-emerald-400" />
                      </div>
                      <div className="mt-1 text-xl font-bold text-emerald-400">
                        {selected.sessionsCompleted}
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card/40 p-3">
                      <div className="flex items-center justify-between text-muted-foreground text-xs">
                        <span>{vi ? 'Học phí 1-1' : '1-on-1 Rate'}</span>
                        <span className="text-[10px] text-muted-foreground">/h</span>
                      </div>
                      <div className="mt-1 text-base font-bold text-primary truncate" title={formatCurrency(selected.hourlyRate)}>
                        {selected.hourlyRate ? formatCurrency(selected.hourlyRate) : '—'}
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card/40 p-3">
                      <div className="flex items-center justify-between text-muted-foreground text-xs">
                        <span>{vi ? 'Học phí nhóm' : 'Group Rate'}</span>
                        <span className="text-[10px] text-muted-foreground">/h</span>
                      </div>
                      <div className="mt-1 text-base font-bold text-primary truncate" title={formatCurrency(selected.groupRate)}>
                        {selected.groupRate ? formatCurrency(selected.groupRate) : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Bio / About */}
                  <div className="rounded-xl border border-border p-4 space-y-1.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {vi ? 'Giới thiệu bản thân' : 'About / Biography'}
                    </h4>
                    <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                      {selected.about?.trim() || (vi ? 'Chưa cập nhật phần giới thiệu bản thân.' : 'No biography provided.')}
                    </p>
                  </div>

                  {/* Courses Taught */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <BookOpen className="size-3.5" />
                        {vi ? 'Môn học giảng dạy' : 'Courses Taught'} ({selected.courses?.length || 0})
                      </h4>
                    </div>

                    {selected.courses && selected.courses.length > 0 ? (
                      <div className="rounded-xl border border-border overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                            <tr>
                              <th className="py-2.5 px-3 text-left font-semibold">{vi ? 'Mã môn' : 'Code'}</th>
                              <th className="py-2.5 px-3 text-left font-semibold">{vi ? 'Tên môn' : 'Course Name'}</th>
                              <th className="py-2.5 px-3 text-center font-semibold">{vi ? 'Điểm' : 'Grade'}</th>
                              <th className="py-2.5 px-3 text-right font-semibold">{vi ? 'Giá 1-1' : 'Private'}</th>
                              <th className="py-2.5 px-3 text-right font-semibold">{vi ? 'Giá nhóm' : 'Group'}</th>
                              <th className="py-2.5 px-3 text-center font-semibold">{vi ? 'Xác minh' : 'Status'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {selected.courses.map((c, i) => (
                              <tr key={c.code + i} className="hover:bg-muted/20">
                                <td className="py-2 px-3 font-semibold text-primary">{c.code}</td>
                                <td className="py-2 px-3 text-foreground font-medium">{c.name || c.code}</td>
                                <td className="py-2 px-3 text-center">
                                  {c.grade ? (
                                    <span className="rounded bg-primary/10 px-1.5 py-0.5 font-bold text-primary text-[10px]">
                                      {c.grade}
                                    </span>
                                  ) : '—'}
                                </td>
                                <td className="py-2 px-3 text-right font-medium text-foreground">
                                  {c.ratePrivate ? `${formatCurrency(c.ratePrivate)}/h` : '—'}
                                </td>
                                <td className="py-2 px-3 text-right font-medium text-foreground">
                                  {c.rateGroup ? `${formatCurrency(c.rateGroup)}/h` : '—'}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  {c.verified ? (
                                    <span className="inline-flex items-center gap-0.5 text-emerald-400 font-medium text-[11px]">
                                      <CheckCircle2 className="size-3" /> {vi ? 'Đã duyệt' : 'Verified'}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground text-[11px]">
                                      {vi ? 'Chưa duyệt' : 'Unverified'}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic rounded-xl border border-dashed border-border p-4 text-center">
                        {vi ? 'Mentor chưa đăng ký môn học nào.' : 'No courses registered by this mentor.'}
                      </p>
                    )}
                  </div>

                  {/* Skills & Formats & Languages */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border p-3.5 space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Award className="size-3.5" />
                        {vi ? 'Kỹ năng & Chuyên môn' : 'Expertise & Skills'}
                      </h4>
                      {selected.expertise && selected.expertise.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {selected.expertise.map((s, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">{vi ? 'Chưa cập nhật' : 'None specified'}</p>
                      )}
                    </div>

                    <div className="rounded-xl border border-border p-3.5 space-y-2.5 text-xs">
                      <div>
                        <span className="font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
                          <Languages className="size-3.5" />
                          {vi ? 'Ngôn ngữ' : 'Languages'}
                        </span>
                        <span className="text-foreground">
                          {selected.languages && selected.languages.length > 0
                            ? selected.languages.join(', ')
                            : (vi ? 'Tiếng Việt' : 'Vietnamese')}
                        </span>
                      </div>

                      <div>
                        <span className="font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
                          <Video className="size-3.5" />
                          {vi ? 'Hình thức dạy' : 'Teaching Formats'}
                        </span>
                        <span className="text-foreground">
                          {selected.formats && selected.formats.length > 0
                            ? selected.formats.join(', ')
                            : 'Online, Offline'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Weekly Availability */}
                  {selected.availability && Object.keys(selected.availability).length > 0 && (
                    <div className="rounded-xl border border-border p-3.5 space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="size-3.5" />
                        {vi ? 'Khung giờ rảnh trong tuần' : 'Weekly Availability'}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {Object.entries(selected.availability).map(([day, slots]) => (
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
              )}

              {/* TAB 2: SCHEDULE & MENTEES */}
              {modalTab === 'schedule' && (
                <div className="space-y-4">
                  {/* Top Stats for Teaching Schedule */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="rounded-xl border border-border bg-card/40 p-3">
                      <div className="flex items-center justify-between text-muted-foreground text-xs">
                        <span>{vi ? 'Tổng buổi dạy' : 'Total Sessions'}</span>
                        <BookOpen className="size-3.5 text-primary" />
                      </div>
                      <div className="mt-1 text-xl font-bold text-foreground">
                        {mentorBookingStats.total}
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card/40 p-3">
                      <div className="flex items-center justify-between text-muted-foreground text-xs">
                        <span>{vi ? 'Học viên đã học' : 'Unique Mentees'}</span>
                        <Users className="size-3.5 text-blue-400" />
                      </div>
                      <div className="mt-1 text-xl font-bold text-blue-400">
                        {mentorBookingStats.uniqueMentees}
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card/40 p-3">
                      <div className="flex items-center justify-between text-muted-foreground text-xs">
                        <span>{vi ? 'Doanh thu hoàn tất' : 'Completed Revenue'}</span>
                        <DollarSign className="size-3.5 text-emerald-400" />
                      </div>
                      <div className="mt-1 text-base sm:text-lg font-bold text-emerald-400 truncate" title={formatCurrency(mentorBookingStats.revenue)}>
                        {formatCurrency(mentorBookingStats.revenue)}
                      </div>
                    </div>
                  </div>

                  {/* Filter Toolbar for Schedule */}
                  <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between pt-1">
                    {/* Status Tabs */}
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        variant={bookingFilter === 'ALL' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setBookingFilter('ALL')}
                        className="h-8 text-xs"
                      >
                        {vi ? 'Tất cả' : 'All'} ({mentorBookingStats.total})
                      </Button>
                      <Button
                        type="button"
                        variant={bookingFilter === 'UPCOMING' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setBookingFilter('UPCOMING')}
                        className="h-8 text-xs text-amber-400"
                      >
                        {vi ? 'Sắp tới' : 'Upcoming'} ({mentorBookingStats.upcoming})
                      </Button>
                      <Button
                        type="button"
                        variant={bookingFilter === 'COMPLETED' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setBookingFilter('COMPLETED')}
                        className="h-8 text-xs text-emerald-400"
                      >
                        {vi ? 'Đã hoàn thành' : 'Completed'} ({mentorBookingStats.completed})
                      </Button>
                      <Button
                        type="button"
                        variant={bookingFilter === 'CANCELLED' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setBookingFilter('CANCELLED')}
                        className="h-8 text-xs text-muted-foreground"
                      >
                        {vi ? 'Đã hủy' : 'Cancelled'} ({mentorBookingStats.cancelled})
                      </Button>
                    </div>

                    {/* Search by mentee / course */}
                    <div className="relative w-full sm:w-56">
                      <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={bookingSearch}
                        onChange={(e) => setBookingSearch(e.target.value)}
                        placeholder={vi ? 'Tìm học viên, môn học…' : 'Search mentee, course…'}
                        className="bg-input-background pl-8 pr-7 h-8 text-xs"
                      />
                      {bookingSearch && (
                        <button
                          type="button"
                          onClick={() => setBookingSearch('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="size-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* List of Sessions and Mentees */}
                  {loadingBookings ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                      <Loader2 className="size-5 animate-spin" />
                      <span className="text-xs">{vi ? 'Đang tải lịch dạy và học viên…' : 'Loading schedule and mentees…'}</span>
                    </div>
                  ) : filteredBookings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground rounded-xl border border-dashed border-border p-6">
                      <Filter className="size-8 opacity-30 mb-2" />
                      <p className="text-xs font-medium">
                        {mentorBookings.length === 0
                          ? (vi ? 'Mentor này chưa có lịch dạy hoặc học viên nào trên hệ thống.' : 'No teaching sessions or mentees recorded for this mentor.')
                          : (vi ? 'Không có buổi học nào khớp với bộ lọc hiện tại.' : 'No sessions match your selected filter.')}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                      {filteredBookings.map((b) => {
                        const statusConf = bookingStatusConfig[b.status] ?? {
                          labelVi: b.status,
                          labelEn: b.status,
                          color: 'bg-muted text-muted-foreground border-border',
                        };

                        return (
                          <div
                            key={b.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-card/50 p-3.5 hover:bg-card/80 transition-all"
                          >
                            {/* Left: Mentee details */}
                            <div className="flex items-center gap-3">
                              <ImageWithFallback
                                src={b.menteeAvatarUrl ?? ''}
                                alt={b.menteeName ?? b.menteeId}
                                className="size-11 rounded-xl object-cover ring-1 ring-border shrink-0"
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-foreground text-sm">
                                    {b.menteeName || (vi ? 'Học viên ẩn danh' : 'Student')}
                                  </p>
                                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                                    {b.courseCode}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                                  {b.menteeEmail && <span className="text-foreground/80">{b.menteeEmail}</span>}
                                  <span className="font-mono text-[11px] opacity-75">ID: {b.menteeId.slice(0, 8)}…</span>
                                </div>
                              </div>
                            </div>

                            {/* Right: Session date, duration, price, and status badge */}
                            <div className="flex flex-wrap sm:flex-col sm:items-end justify-between items-center gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50 text-xs">
                              <div className="flex items-center gap-2">
                                <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium', statusConf.color)}>
                                  {vi ? statusConf.labelVi : statusConf.labelEn}
                                </span>
                                <span className="font-bold text-foreground">
                                  {formatCurrency(b.price)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                                <Calendar className="size-3" />
                                <span>{formatDateTime(b.startAt, lang)}</span>
                                <span>• {b.durationMin}p</span>
                                <span>• {b.format === 'ONE_ON_ONE' ? (vi ? '1 kèm 1' : '1-on-1') : (vi ? 'Nhóm' : 'Group')}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-border pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/mentors/${selected.id}`, '_blank')}
                className="gap-1.5 text-xs text-primary hover:text-primary"
              >
                <ExternalLink className="size-3.5" />
                {vi ? 'Xem trang công khai của Mentor' : 'Open Public Profile'}
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant={selected.suspended ? 'default' : 'destructive'}
                  size="sm"
                  disabled={actingId === selected.userId}
                  onClick={() => toggleSuspend(selected)}
                  className="gap-1.5 text-xs"
                >
                  {actingId === selected.userId ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : selected.suspended ? (
                    <Unlock className="size-3.5" />
                  ) : (
                    <Lock className="size-3.5" />
                  )}
                  {selected.suspended
                    ? (vi ? 'Mở khoá tài khoản' : 'Unlock Account')
                    : (vi ? 'Tạm khoá tài khoản' : 'Suspend Account')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="text-xs">
                  {vi ? 'Đóng' : 'Close'}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
