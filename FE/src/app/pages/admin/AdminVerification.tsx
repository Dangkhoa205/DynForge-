import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../components/ui/dialog';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { StatusBadge } from '../../components/common';
import { Loader2, FileText, ExternalLink, Eye } from 'lucide-react';
import { toast } from 'sonner';
import {
  listVerifications,
  decideVerification,
  type VerificationItem,
} from '../../services/verificationService';
import { useLanguage } from '../../context/LanguageContext';
import { formatDate } from '../../lib/format';
import { parseDocRef, openVerificationDocument } from '../../services/verificationService';

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

export function AdminVerification() {
  const { lang } = useLanguage();
  const vi = lang === 'vi';
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<VerificationItem | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [deciding, setDeciding] = useState(false);

  useEffect(() => {
    listVerifications()
      .then(setItems)
      .catch(() => toast.error(vi ? 'Không tải được yêu cầu xác minh.' : 'Failed to load verification requests.'))
      .finally(() => setLoading(false));
  }, []);

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
      <div className="mb-6">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{vi ? 'Xác minh Mentor' : 'Mentor Verification'}</h1>
        <p className="mt-1 text-muted-foreground">{vi ? 'Xem xét và phê duyệt hồ sơ mentor.' : 'Review and approve mentor applications.'}</p>
      </div>

      <Card className="border-border p-6">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="size-5 animate-spin" /> {vi ? 'Đang tải hồ sơ…' : 'Loading applications…'}
          </div>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">{vi ? 'Chưa có yêu cầu xác minh nào.' : 'No verification requests yet.'}</p>
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
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ImageWithFallback
                          src={item.avatarUrl ?? ''}
                          alt={item.userName ?? item.userId}
                          className="size-9 rounded-xl object-cover"
                        />
                        <div>
                          <p style={{ fontWeight: 500 }} className={!item.userName ? 'text-muted-foreground italic' : ''}>
                            {item.userName || (vi ? '[Tài khoản đã bị xóa]' : '[Deleted User]')}
                          </p>
                          <p className="text-xs text-muted-foreground">{item.userId.slice(0, 8)}…</p>
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
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {selected && (
        <Dialog open={!!selected} onOpenChange={() => { setSelected(null); setRejectNote(''); }}>
          <DialogContent className="max-w-lg" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>{vi ? 'Xét duyệt' : 'Review'}: {selected.userName || (vi ? '[Tài khoản đã bị xóa]' : '[Deleted User]')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <ImageWithFallback
                  src={selected.avatarUrl ?? ''}
                  alt={selected.userName ?? ''}
                  className="size-14 rounded-xl object-cover"
                />
                <div>
                  <p style={{ fontWeight: 600 }} className={!selected.userName ? 'text-muted-foreground italic' : ''}>
                    {selected.userName || (vi ? '[Tài khoản đã bị xóa]' : '[Deleted User]')}
                  </p>
                  <p className="text-sm text-muted-foreground">{vi ? 'Đăng ký môn:' : 'Applied for:'} <strong>{selected.course}</strong></p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-border p-3">
                  <p className="text-muted-foreground">{vi ? 'Điểm khai báo' : 'Claimed grade'}</p>
                  <p style={{ fontWeight: 600 }}>{selected.claimedGrade}</p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-muted-foreground">{vi ? 'Bảng điểm' : 'Transcript'}</p>
                  <div className="pt-1"><DocumentLink value={selected.transcriptUrl} vi={vi} /></div>
                </div>
              </div>

              {selected.alumniProofUrl && (
                <div className="rounded-xl border border-border p-3 text-sm">
                  <p className="text-muted-foreground">{vi ? 'Minh chứng cựu sinh viên' : 'Alumni Proof'}</p>
                  <div className="pt-1"><DocumentLink value={selected.alumniProofUrl} vi={vi} /></div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>{vi ? 'Ghi chú từ chối (bắt buộc khi từ chối)' : 'Rejection note (required when rejecting)'}</Label>
                <Textarea
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder={vi ? 'Giải thích vì sao hồ sơ bị từ chối…' : 'Explain why the application is rejected…'}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="destructive" onClick={() => handleDecide('REJECTED')} disabled={deciding}>
                {deciding ? <Loader2 className="size-4 animate-spin" /> : (vi ? 'Từ chối' : 'Reject')}
              </Button>
              <Button onClick={() => handleDecide('APPROVED')} disabled={deciding}>
                {deciding ? <Loader2 className="size-4 animate-spin" /> : (vi ? 'Duyệt' : 'Approve')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
