import { useEffect, useMemo, useState } from 'react';
import { Loader2, MessageSquareText, Star, Search } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { KpiCard } from '../../components/cards';
import { StarRating } from '../../components/common';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import { toast } from 'sonner';
import { getFeedbackReport, type FeedbackReport } from '../../services/adminService';
import { useLanguage } from '../../context/LanguageContext';
import { formatDateTime } from '../../lib/format';

/** Feedback users leave after a session: when, who, which mentor, stars and comment. */
export function AdminFeedback() {
  const { lang } = useLanguage();
  const vi = lang === 'vi';
  const [report, setReport] = useState<FeedbackReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [stars, setStars] = useState('all');

  useEffect(() => {
    getFeedbackReport()
      .then(setReport)
      .catch(() => toast.error(vi ? 'Không tải được phản hồi.' : 'Failed to load feedback.'))
      .finally(() => setLoading(false));
  }, []);

  const reviews = useMemo(() => (report?.reviews ?? []).filter((r) => {
    const q = query.trim().toLowerCase();
    const matchQ = !q || [r.menteeName, r.mentorName, r.courseCode, r.comment]
      .some((v) => (v ?? '').toLowerCase().includes(q));
    const matchS = stars === 'all' || String(r.rating) === stars;
    return matchQ && matchS;
  }), [report, query, stars]);

  if (loading || !report) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" /> {vi ? 'Đang tải phản hồi…' : 'Loading feedback…'}
      </div>
    );
  }

  const fiveStar = report.ratingDistribution.find((b) => b.label.startsWith('5'))?.count ?? 0;

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="mb-6">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{vi ? 'Phản hồi người dùng' : 'User feedback'}</h1>
        <p className="mt-1 text-muted-foreground">
          {vi ? 'Đánh giá học viên để lại sau mỗi buổi học: thời gian, mentor, số sao và nhận xét.' : 'Reviews left after each session: time, mentor, stars and comments.'}
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <KpiCard label={vi ? 'Tổng phản hồi' : 'Total reviews'} value={String(report.totalReviews)} icon={MessageSquareText} />
        <KpiCard label={vi ? 'Điểm trung bình' : 'Average rating'} value={`${report.averageRating.toFixed(1)} / 5`} icon={Star} tone="warning" />
        <KpiCard label={vi ? 'Đánh giá 5 sao' : '5-star reviews'} value={String(fiveStar)} icon={Star} tone="success" />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card className="border-border p-6">
          <h2 className="mb-4" style={{ fontSize: '1.05rem', fontWeight: 600 }}>{vi ? 'Phân bố số sao' : 'Rating distribution'}</h2>
          <ul className="space-y-2.5">
            {report.ratingDistribution.map((b) => {
              const max = Math.max(1, ...report.ratingDistribution.map((x) => x.count));
              return (
                <li key={b.label} className="grid grid-cols-[3.5rem_1fr_2rem] items-center gap-3 text-sm">
                  <span>{b.label}</span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-warning" style={{ width: `${(b.count / max) * 100}%` }} />
                  </span>
                  <span className="text-right tabular-nums">{b.count}</span>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="border-border p-6 lg:col-span-2">
          <h2 className="mb-4" style={{ fontSize: '1.05rem', fontWeight: 600 }}>{vi ? 'Đánh giá theo mentor' : 'Ratings by mentor'}</h2>
          {report.mentorRatings.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{vi ? 'Chưa có đánh giá nào.' : 'No reviews yet.'}</p>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mentor</TableHead>
                    <TableHead>{vi ? 'Điểm TB' : 'Average'}</TableHead>
                    <TableHead className="text-right">{vi ? 'Số đánh giá' : 'Reviews'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.mentorRatings.map((m) => (
                    <TableRow key={m.mentorId}>
                      <TableCell style={{ fontWeight: 500 }}>{m.mentorName || m.mentorId.slice(-8)}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2"><StarRating rating={m.averageRating} /></span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{m.reviewCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      <Card className="border-border p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={vi ? 'Tìm theo học viên, mentor, môn học hoặc nội dung' : 'Search mentee, mentor, course or comment'}
              className="bg-input-background pl-9"
            />
          </div>
          <Select value={stars} onValueChange={setStars}>
            <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{vi ? 'Tất cả số sao' : 'All ratings'}</SelectItem>
              {[5, 4, 3, 2, 1].map((n) => <SelectItem key={n} value={String(n)}>{n} {vi ? 'sao' : 'stars'}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">{reviews.length} {vi ? 'phản hồi' : 'reviews'}</p>
        {reviews.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{vi ? 'Không có phản hồi phù hợp.' : 'No matching feedback.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{vi ? 'Ngày giờ' : 'Date & time'}</TableHead>
                  <TableHead>{vi ? 'Học viên' : 'Mentee'}</TableHead>
                  <TableHead>Mentor</TableHead>
                  <TableHead>{vi ? 'Môn học' : 'Course'}</TableHead>
                  <TableHead>{vi ? 'Đánh giá' : 'Rating'}</TableHead>
                  <TableHead>{vi ? 'Nhận xét' : 'Comment'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{r.createdAt ? formatDateTime(r.createdAt, lang) : '—'}</TableCell>
                    <TableCell style={{ fontWeight: 500 }}>{r.menteeName || (vi ? 'Tài khoản đã xoá' : 'Deleted account')}</TableCell>
                    <TableCell>{r.mentorName || '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{r.courseCode || '—'}</TableCell>
                    <TableCell><StarRating rating={r.rating} /></TableCell>
                    <TableCell className="max-w-[360px] text-muted-foreground">
                      {r.comment ? <span className="line-clamp-3" title={r.comment}>{r.comment}</span> : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
