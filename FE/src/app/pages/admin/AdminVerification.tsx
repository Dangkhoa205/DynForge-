import { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Tabs, TabsList, TabsTrigger,
} from '../../components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../components/ui/dialog';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { StatusBadge } from '../../components/common';
import {
  Loader2,
  FileText,
  ExternalLink,
  Eye,
  Search,
  Filter,
  UserCheck,
  UserX,
  Clock,
  RotateCcw,
  X,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  listVerifications,
  decideVerification,
  type VerificationItem,
} from '../../services/verificationService';
import { useLanguage } from '../../context/LanguageContext';
import { formatDate } from '../../lib/format';
import { parseDocRef, openVerificationDocument } from '../../services/verificationService';
import { cn } from '../../components/ui/utils';

/** Shows a verification document: uploaded file (opens it), external link, or an old name-only record. */
function DocumentLink({ value, vi }: { value?: string; vi: boolean }) {
  const [opening, setOpening] = useState(false);
  if (!value) return <span>—</span>;
  const doc = parseDocRef(value);
  if (doc) {
    return (
      <button
        type="button"
        disabled={opening}
        onClick={async () => {
          setOpening(true);
          try {
            await openVerificationDocument(doc.id);
          } catch (err: any) {
            toast.error(err?.response?.status === 404
              ? (vi ? 'Không tìm thấy tệp.' : 'File not found.')
              : (vi ? 'Không mở được tệp.' : 'Could not open the file.'));
          } finally {
            setOpening(false);
          }
        }}
        className="inline-flex max-w-[220px] items-center gap-1.5 rounded bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20"
        title={doc.fileName}
      >
        {opening ? <Loader2 className="size-3.5 shrink-0 animate-spin" /> : <Eye className="size-3.5 shrink-0" />}
        <span className="truncate">{doc.fileName}</span>
      </button>
    );
  }
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer"
         className="inline-flex max-w-[220px] items-center gap-1 text-xs text-primary underline">
        <ExternalLink className="size-3 shrink-0" />
        <span className="truncate">{value}</span>
      </a>
    );
  }
  // Old records only kept the file name — the file itself was never uploaded.
  return (
    <span className="inline-flex max-w-[220px] items-center gap-1.5 rounded bg-muted/60 px-2 py-1 font-mono text-xs text-muted-foreground"
          title={vi ? `${value} — hồ sơ cũ, tệp chưa được tải lên` : `${value} — old record, file was not uploaded`}>
      <FileText className="size-3.5 shrink-0" />
      <span className="truncate">{value}</span>
    </span>
  );
}

function isDeletedAccount(item: VerificationItem): boolean {
  return !item.userName || item.userName.trim() === '';
}

export function AdminVerification() {
  const { lang } = useLanguage();
  const vi = lang === 'vi';
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<VerificationItem | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [deciding, setDeciding] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [accountFilter, setAccountFilter] = useState<'ALL' | 'ACTIVE' | 'DELETED'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  useEffect(() => {
    listVerifications()
      .then(setItems)
      .catch(() => toast.error(vi ? 'Không tải được yêu cầu xác minh.' : 'Failed to load verification requests.'))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const total = items.length;
    const pending = items.filter((i) => i.status === 'PENDING').length;
    const active = items.filter((i) => !isDeletedAccount(i)).length;
    const deleted = items.filter((i) => isDeletedAccount(i)).length;
    return { total, pending, active, deleted };
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      // Search matching
      const matchesSearch =
        !q ||
        (item.userName && item.userName.toLowerCase().includes(q)) ||
        (item.course && item.course.toLowerCase().includes(q)) ||
        (item.claimedGrade && item.claimedGrade.toLowerCase().includes(q)) ||
        (item.userId && item.userId.toLowerCase().includes(q)) ||
        (item.id && item.id.toLowerCase().includes(q));

      // Account filter matching
      const isDeleted = isDeletedAccount(item);
      const matchesAccount =
        accountFilter === 'ALL' ||
        (accountFilter === 'ACTIVE' && !isDeleted) ||
        (accountFilter === 'DELETED' && isDeleted);

      // Status filter matching
      const matchesStatus =
        statusFilter === 'ALL' || item.status === statusFilter;

      return matchesSearch && matchesAccount && matchesStatus;
    });
  }, [items, searchQuery, accountFilter, statusFilter]);

  const isFiltered = searchQuery !== '' || accountFilter !== 'ALL' || statusFilter !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setAccountFilter('ALL');
    setStatusFilter('ALL');
  };

  const handleDecide = async (status: 'APPROVED' | 'REJECTED') => {
    if (!selected) return;
    if (status === 'REJECTED' && !rejectNote.trim()) {
      toast.error(vi ? 'Vui lòng nhập lý do từ chối.' : 'Please enter a rejection reason.');
      return;
    }
    setDeciding(true);
    try {
      const updated = await decideVerification(selected.id, status, rejectNote.trim() || undefined);
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      toast.success(status === 'APPROVED'
        ? (vi ? `Đã duyệt ${selected.userName ?? 'Mentor'} thành công.` : `${selected.userName ?? 'Mentor'} approved successfully.`)
        : (vi ? `Đã từ chối hồ sơ của ${selected.userName ?? 'Mentor'}.` : `${selected.userName ?? 'Mentor'}'s application rejected.`));
      setSelected(null);
      setRejectNote('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? (vi ? 'Thao tác thất bại. Vui lòng thử lại.' : 'Action failed. Please try again.'));
    } finally {
      setDeciding(false);
    }
  };

  const statusLabel = (s: string) => {
    if (s === 'APPROVED') return 'Approved';
    if (s === 'REJECTED') return 'Rejected';
    return 'Pending';
  };

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{vi ? 'Xác minh Mentor' : 'Mentor Verification'}</h1>
          <p className="mt-1 text-muted-foreground">{vi ? 'Xem xét và phê duyệt hồ sơ bằng cấp/điểm môn học của mentor.' : 'Review and approve mentor subject qualification applications.'}</p>
        </div>
      </div>

      {/* KPI Overview Cards / Instant Filter Buttons */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => { setAccountFilter('ALL'); setStatusFilter('ALL'); }}
          className={cn(
            'flex flex-col items-start rounded-2xl border p-4 text-left transition-all',
            accountFilter === 'ALL' && statusFilter === 'ALL'
              ? 'border-primary/60 bg-primary/10 shadow-sm ring-1 ring-primary/40'
              : 'border-border bg-card/60 hover:border-border/80 hover:bg-card'
          )}
        >
          <div className="flex w-full items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">{vi ? 'Tổng hồ sơ' : 'Total Requests'}</span>
            <FileText className="size-4" />
          </div>
          <span className="mt-2 text-2xl font-bold">{stats.total}</span>
        </button>

        <button
          type="button"
          onClick={() => { setStatusFilter('PENDING'); }}
          className={cn(
            'flex flex-col items-start rounded-2xl border p-4 text-left transition-all',
            statusFilter === 'PENDING'
              ? 'border-amber-500/60 bg-amber-500/10 shadow-sm ring-1 ring-amber-500/40'
              : 'border-border bg-card/60 hover:border-border/80 hover:bg-card'
          )}
        >
          <div className="flex w-full items-center justify-between text-amber-500">
            <span className="text-xs font-medium">{vi ? 'Chờ xét duyệt' : 'Pending Review'}</span>
            <Clock className="size-4" />
          </div>
          <span className="mt-2 text-2xl font-bold text-amber-500">{stats.pending}</span>
        </button>

        <button
          type="button"
          onClick={() => { setAccountFilter('ACTIVE'); }}
          className={cn(
            'flex flex-col items-start rounded-2xl border p-4 text-left transition-all',
            accountFilter === 'ACTIVE'
              ? 'border-emerald-500/60 bg-emerald-500/10 shadow-sm ring-1 ring-emerald-500/40'
              : 'border-border bg-card/60 hover:border-border/80 hover:bg-card'
          )}
        >
          <div className="flex w-full items-center justify-between text-emerald-500">
            <span className="text-xs font-medium">{vi ? 'Đang hoạt động' : 'Active Users'}</span>
            <UserCheck className="size-4" />
          </div>
          <span className="mt-2 text-2xl font-bold text-emerald-500">{stats.active}</span>
        </button>

        <button
          type="button"
          onClick={() => { setAccountFilter('DELETED'); }}
          className={cn(
            'flex flex-col items-start rounded-2xl border p-4 text-left transition-all',
            accountFilter === 'DELETED'
              ? 'border-destructive/60 bg-destructive/10 shadow-sm ring-1 ring-destructive/40'
              : 'border-border bg-card/60 hover:border-border/80 hover:bg-card'
          )}
        >
          <div className="flex w-full items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">{vi ? 'Tài khoản đã xóa' : 'Deleted Accounts'}</span>
            <UserX className="size-4" />
          </div>
          <span className="mt-2 text-2xl font-bold text-muted-foreground">{stats.deleted}</span>
        </button>
      </div>

      <Card className="border-border p-6">
        {/* Filter Controls Toolbar */}
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Account Filter Segmented Tabs */}
          <Tabs
            value={accountFilter}
            onValueChange={(val) => setAccountFilter(val as 'ALL' | 'ACTIVE' | 'DELETED')}
            className="w-full lg:w-auto"
          >
            <TabsList className="bg-muted/60 p-1">
              <TabsTrigger value="ALL" className="gap-1.5 text-xs sm:text-sm">
                {vi ? 'Tất cả' : 'All'}
                <span className="ml-1 rounded-full bg-muted-foreground/20 px-1.5 py-0.5 text-[10px] font-semibold">
                  {stats.total}
                </span>
              </TabsTrigger>
              <TabsTrigger value="ACTIVE" className="gap-1.5 text-xs sm:text-sm">
                <UserCheck className="size-3.5 text-emerald-400" />
                {vi ? 'Đang hoạt động' : 'Active Only'}
                <span className="ml-1 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                  {stats.active}
                </span>
              </TabsTrigger>
              <TabsTrigger value="DELETED" className="gap-1.5 text-xs sm:text-sm">
                <UserX className="size-3.5 text-destructive" />
                {vi ? 'Tài khoản đã xóa' : 'Deleted Only'}
                <span className="ml-1 rounded-full bg-destructive/20 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                  {stats.deleted}
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search Bar + Status Filter Dropdown */}
          <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center lg:max-w-md lg:justify-end">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={vi ? 'Tìm theo tên, môn học, ID…' : 'Search name, course, ID…'}
                className="bg-input-background pl-9 pr-8 text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <Select
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val as 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED')}
            >
              <SelectTrigger className="w-full sm:w-36 text-xs sm:text-sm">
                <SelectValue placeholder={vi ? 'Trạng thái' : 'Status'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{vi ? 'Mọi trạng thái' : 'All Statuses'}</SelectItem>
                <SelectItem value="PENDING">{vi ? 'Đang chờ' : 'Pending'}</SelectItem>
                <SelectItem value="APPROVED">{vi ? 'Đã duyệt' : 'Approved'}</SelectItem>
                <SelectItem value="REJECTED">{vi ? 'Đã từ chối' : 'Rejected'}</SelectItem>
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
        </div>

        {/* Content Table / Empty State */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="size-5 animate-spin" /> {vi ? 'Đang tải hồ sơ…' : 'Loading applications…'}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center text-muted-foreground">
            <Filter className="size-10 opacity-30 mb-2" />
            <p className="font-medium">
              {isFiltered
                ? (vi ? 'Không tìm thấy hồ sơ nào khớp với bộ lọc hiện tại.' : 'No verification requests match your filters.')
                : (vi ? 'Chưa có yêu cầu xác minh nào.' : 'No verification requests yet.')}
            </p>
            {isFiltered && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="mt-3 text-xs"
              >
                <RotateCcw className="size-3.5 mr-1.5" />
                {vi ? 'Đặt lại bộ lọc để xem tất cả' : 'Reset filters to view all'}
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{vi ? 'Người nộp' : 'Applicant'}</TableHead>
                  <TableHead>{vi ? 'Môn học' : 'Course'}</TableHead>
                  <TableHead>{vi ? 'Điểm' : 'Grade'}</TableHead>
                  <TableHead>{vi ? 'Bảng điểm' : 'Transcript'}</TableHead>
                  <TableHead>{vi ? 'Ngày nộp' : 'Submitted'}</TableHead>
                  <TableHead>{vi ? 'Trạng thái' : 'Status'}</TableHead>
                  <TableHead className="text-right">{vi ? 'Thao tác' : 'Action'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const deleted = isDeletedAccount(item);
                  return (
                    <TableRow key={item.id} className={deleted ? 'opacity-85 hover:bg-muted/30' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="relative shrink-0">
                            <ImageWithFallback
                              src={item.avatarUrl ?? ''}
                              alt={item.userName ?? item.userId}
                              className={cn('size-9 rounded-xl object-cover', deleted && 'opacity-60 grayscale')}
                            />
                            {deleted && (
                              <span
                                className="absolute -bottom-1 -right-1 rounded-full bg-destructive/20 p-0.5 text-destructive"
                                title={vi ? 'Tài khoản đã bị xóa' : 'Deleted Account'}
                              >
                                <UserX className="size-2.5" />
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p
                                style={{ fontWeight: 500 }}
                                className={deleted ? 'text-muted-foreground italic' : ''}
                              >
                                {item.userName || (vi ? '[Tài khoản đã bị xóa]' : '[Deleted User]')}
                              </p>
                              {deleted && (
                                <span className="rounded bg-destructive/10 px-1.5 py-0.2 text-[10px] font-medium text-destructive">
                                  {vi ? 'Đã xóa' : 'Deleted'}
                                </span>
                              )}
                            </div>
                            <p className="font-mono text-xs text-muted-foreground">{item.userId.slice(0, 8)}…</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell style={{ fontWeight: 500 }}>{item.course}</TableCell>
                      <TableCell>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary" style={{ fontWeight: 600 }}>
                          {item.claimedGrade}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <DocumentLink value={item.transcriptUrl} vi={vi} />
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {formatDate(item.createdAt, lang, { day: '2-digit', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell><StatusBadge status={statusLabel(item.status)} /></TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setSelected(item); setRejectNote(item.note ?? ''); }}
                          disabled={item.status !== 'PENDING'}
                        >
                          {item.status === 'PENDING' ? (vi ? 'Xét duyệt' : 'Review') : (vi ? 'Đã xét' : 'Reviewed')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {selected && (
        <Dialog open={!!selected} onOpenChange={() => { setSelected(null); setRejectNote(''); }}>
          <DialogContent className="w-[92vw] max-w-4xl sm:max-w-4xl max-h-[92vh] overflow-y-auto" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCheck className="size-5 text-primary" />
                {vi ? 'Xét duyệt minh chứng chuyên môn' : 'Verification Review'}: {selected.userName || (vi ? '[Tài khoản đã bị xóa]' : '[Deleted User]')}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-1">
              {isDeletedAccount(selected) && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-500">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>
                    {vi
                      ? 'Lưu ý: Tài khoản của người nộp này đã bị xóa khỏi hệ thống. Việc duyệt hồ sơ sẽ không thể phân quyền Mentor cho người dùng.'
                      : 'Notice: This applicant account has been deleted from the database. Approving will not grant Mentor privileges.'}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Left Column: Applicant Identity & Notes (7 cols) */}
                <div className="md:col-span-7 space-y-4">
                  <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-card/60 p-4">
                    <ImageWithFallback
                      src={selected.avatarUrl ?? ''}
                      alt={selected.userName ?? ''}
                      className="size-14 rounded-2xl object-cover ring-2 ring-primary/20 shrink-0"
                    />
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={cn('text-base font-bold', !selected.userName && 'text-muted-foreground italic')}>
                          {selected.userName || (vi ? '[Tài khoản đã bị xóa]' : '[Deleted User]')}
                        </p>
                        {isDeletedAccount(selected) && (
                          <Badge variant="destructive" className="bg-destructive/20 text-destructive text-[10px]">
                            {vi ? 'Tài khoản đã xóa' : 'Deleted'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">User ID: {selected.userId}</p>
                      <p className="text-xs text-primary font-medium">
                        {vi ? 'Môn đăng ký:' : 'Applied for:'} <strong className="text-foreground">{selected.course}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">{vi ? 'Ghi chú từ chối (bắt buộc khi từ chối hồ sơ)' : 'Rejection note (required when rejecting)'}</Label>
                    <Textarea
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      placeholder={vi ? 'Nhập lý do chi tiết vì sao hồ sơ hoặc minh chứng bị từ chối…' : 'Explain specifically why the transcript or application was rejected…'}
                      rows={4}
                      className="text-xs"
                    />
                  </div>
                </div>

                {/* Right Column: Academic & Proof Documents (5 cols) */}
                <div className="md:col-span-5 space-y-3">
                  <div className="rounded-xl border border-border p-3.5 space-y-1 bg-card/40">
                    <p className="text-xs text-muted-foreground">{vi ? 'Điểm môn khai báo' : 'Claimed Grade'}</p>
                    <p className="text-2xl font-black text-primary">{selected.claimedGrade}</p>
                  </div>

                  <div className="rounded-xl border border-border p-3.5 space-y-2 bg-card/40">
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <FileText className="size-3.5 text-primary" />
                      {vi ? 'Bảng điểm / Minh chứng học tập' : 'Academic Transcript'}
                    </p>
                    <div className="pt-1"><DocumentLink value={selected.transcriptUrl} vi={vi} /></div>
                  </div>

                  {selected.alumniProofUrl && (
                    <div className="rounded-xl border border-border p-3.5 space-y-2 bg-card/40">
                      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <UserCheck className="size-3.5 text-blue-400" />
                        {vi ? 'Minh chứng cựu sinh viên (Alumni)' : 'Alumni Proof Document'}
                      </p>
                      <div className="pt-1"><DocumentLink value={selected.alumniProofUrl} vi={vi} /></div>
                    </div>
                  )}

                  {(selected.documents?.length ?? 0) > 0 && (
                    <div className="rounded-xl border border-border p-3.5 space-y-2 bg-card/40">
                      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <FileText className="size-3.5 text-primary" />
                        {vi ? `Tất cả giấy tờ đã nộp (${selected.documents!.length})` : `All submitted documents (${selected.documents!.length})`}
                      </p>
                      <ul className="space-y-1.5">
                        {selected.documents!.map((entry, i) => {
                          const bar = entry.indexOf('|');
                          const category = bar > 0 ? entry.slice(0, bar) : 'other';
                          const ref = bar > 0 ? entry.slice(bar + 1) : entry;
                          const label: Record<string, string> = vi
                            ? { transcript: 'Bảng điểm', certificate: 'Chứng chỉ', portfolio: 'Portfolio', id: 'Thẻ SV/CB', other: 'Khác' }
                            : { transcript: 'Transcript', certificate: 'Certificate', portfolio: 'Portfolio', id: 'ID card', other: 'Other' };
                          return (
                            <li key={`${ref}-${i}`} className="flex items-center gap-2">
                              <span className="w-20 shrink-0 text-[11px] text-muted-foreground">{label[category] ?? category}</span>
                              <DocumentLink value={ref} vi={vi} />
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  <div className="text-[11px] text-muted-foreground font-mono pt-1">
                    {vi ? 'Ngày nộp:' : 'Submitted:'} {formatDate(selected.createdAt, lang)}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 border-t border-border pt-4">
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="text-xs">
                {vi ? 'Hủy' : 'Cancel'}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleDecide('REJECTED')} disabled={deciding} className="text-xs">
                {deciding ? <Loader2 className="size-4 animate-spin" /> : (vi ? 'Từ chối' : 'Reject')}
              </Button>
              <Button size="sm" onClick={() => handleDecide('APPROVED')} disabled={deciding} className="text-xs">
                {deciding ? <Loader2 className="size-4 animate-spin" /> : (vi ? 'Duyệt hồ sơ' : 'Approve')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
