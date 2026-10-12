import { Star, ShieldCheck, BadgeCheck } from 'lucide-react';
import { Badge } from './ui/badge';
import { cn } from './ui/utils';
import { useLanguage } from '../context/LanguageContext';

export function StarRating({
  rating,
  count,
  size = 'sm',
}: {
  rating: number;
  count?: number;
  size?: 'sm' | 'md';
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <Star
        className={cn('fill-warning text-warning', size === 'sm' ? 'size-4' : 'size-5')}
      />
      <span className="text-foreground" style={{ fontWeight: 600 }}>
        {rating.toFixed(1)}
      </span>
      {count !== undefined && (
        <span className="text-muted-foreground text-sm">({count})</span>
      )}
    </span>
  );
}

export function VerifiedBadge({ verified }: { verified: boolean }) {
  const { T } = useLanguage();
  if (!verified)
    return (
      <Badge variant="secondary" className="gap-1 bg-muted text-muted-foreground">
        {T.unverified}
      </Badge>
    );
  return (
    <Badge className="gap-1 bg-success/10 text-success border border-success/20">
      <BadgeCheck className="size-3.5" /> {T.verified}
    </Badge>
  );
}

const statusStyles: Record<string, string> = {
  Upcoming: 'bg-primary/10 text-primary border-primary/20',
  'In Escrow': 'bg-warning/10 text-warning border-warning/20',
  Completed: 'bg-success/10 text-success border-success/20',
  Scheduled: 'bg-success/10 text-success border-success/20',
  Cancelled: 'bg-danger/10 text-danger border-danger/20',
  Refunded: 'bg-success/10 text-success border-success/20',
  Released: 'bg-success/10 text-success border-success/20',
  'Pending Payout': 'bg-warning/10 text-warning border-warning/20',
  Pending: 'bg-warning/10 text-warning border-warning/20',
  Open: 'bg-danger/10 text-danger border-danger/20',
  'Under Review': 'bg-warning/10 text-warning border-warning/20',
  Resolved: 'bg-success/10 text-success border-success/20',
  Rejected: 'bg-danger/10 text-danger border-danger/20',
  'Waiting for Mentor': 'bg-warning/10 text-warning border-warning/20',
  Approved: 'bg-success/10 text-success border-success/20',
  Active: 'bg-success/10 text-success border-success/20',
  Suspended: 'bg-danger/10 text-danger border-danger/20',
  Deleted: 'bg-muted text-muted-foreground border-border',
  Paid: 'bg-success/10 text-success border-success/20',
  Failed: 'bg-danger/10 text-danger border-danger/20',
  Accepted: 'bg-primary/10 text-primary border-primary/20',
  Taught: 'bg-primary/10 text-primary border-primary/20',
  Disputed: 'bg-danger/10 text-danger border-danger/20',
  'Pending Payment': 'bg-warning/10 text-warning border-warning/20',
  Low: 'bg-success/10 text-success border-success/20',
  Medium: 'bg-warning/10 text-warning border-warning/20',
  High: 'bg-danger/10 text-danger border-danger/20',
};

const statusLabelsVi: Record<string, string> = {
  Upcoming: 'Sắp diễn ra',
  'In Escrow': 'Đang ký quỹ',
  'Pending Payment': 'Chờ thanh toán',
  Accepted: 'Đã nhận lịch',
  Taught: 'Đã dạy',
  Completed: 'Hoàn thành',
  Scheduled: 'Đã lên lịch',
  Cancelled: 'Đã huỷ',
  Disputed: 'Đang tranh chấp',
  Refunded: 'Đã hoàn tiền',
  Released: 'Đã giải ngân',
  'Pending Payout': 'Chờ chi trả',
  Pending: 'Đang chờ',
  Open: 'Đang mở',
  'Under Review': 'Đang xem xét',
  Resolved: 'Đã giải quyết',
  Rejected: 'Bị từ chối',
  'Waiting for Mentor': 'Chờ mentor',
  Approved: 'Đã duyệt',
  Active: 'Hoạt động',
  Suspended: 'Bị khoá',
  Deleted: 'Đã xoá',
  Paid: 'Đã thanh toán',
  Failed: 'Thất bại',
  Low: 'Thấp',
  Medium: 'Trung bình',
  High: 'Cao',
};

export function StatusBadge({ status }: { status: string }) {
  const { lang } = useLanguage();
  const label = lang === 'vi' ? statusLabelsVi[status] ?? status : status;
  return (
    <Badge className={cn('border', statusStyles[status] ?? 'bg-muted text-muted-foreground')}>
      {label}
    </Badge>
  );
}

export function TrustBadge({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md text-slate-300">
      <span className="flex size-7 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
        <Icon className="size-4" />
      </span>
      <span className="text-sm font-medium">
        {label}
      </span>
    </div>
  );
}

export function EmptyState({
  icon: Icon = ShieldCheck,
  title,
  description,
  action,
  actionLabel,
  onAction,
}: {
  icon?: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-16 text-center text-slate-100">
      <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
        <Icon className="size-7" />
      </span>
      <h3 className="mb-1 text-lg font-semibold text-white">{title}</h3>
      <p className="mb-6 max-w-sm text-slate-400 text-sm">{description}</p>
      {action}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/20 transition-all cursor-pointer shadow-md"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function StepProgress({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <div className="flex items-center">
      {steps.map((step, i) => {
        const done = i <= current;
        return (
          <div key={step} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <span
                className={cn(
                  'flex size-9 items-center justify-center rounded-full border-2 text-sm font-semibold',
                  done
                    ? 'border-cyan-500 bg-cyan-500 text-white shadow-md'
                    : 'border-slate-800 bg-slate-900 text-slate-500'
                )}
              >
                {i + 1}
              </span>
              <span
                className={cn(
                  'max-w-[120px] text-center text-xs font-medium',
                  done ? 'text-cyan-300' : 'text-slate-500'
                )}
              >
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'mx-2 h-0.5 flex-1 rounded-full',
                  i < current ? 'bg-cyan-500' : 'bg-slate-800'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  center,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  center?: boolean;
}) {
  return (
    <div className={cn('mb-8', center && 'text-center')}>
      {eyebrow && (
        <span className="mb-2 inline-block rounded-full bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300 border border-cyan-500/20 font-semibold">
          {eyebrow}
        </span>
      )}
      <h2 className="text-2xl sm:text-4xl font-bold text-white" style={{ fontFamily: "var(--font-heading)" }}>
        {title}
      </h2>
      {subtitle && (
        <p className={cn('mt-2 text-slate-400', center && 'mx-auto max-w-2xl')}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function PageHeader({
  eyebrow = 'DYNFORGE ACADEMIC MENTORING',
  title,
  highlightWord,
  titleEnd,
  subtitle,
  className = '',
}: {
  eyebrow?: string;
  title: string;
  highlightWord?: string;
  titleEnd?: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cn('relative py-10 sm:py-14 text-center max-w-4xl mx-auto px-4 animate-fade-rise', className)}>
      {eyebrow && (
        <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-cyan-400">
          {eyebrow}
        </span>
      )}
      <h1
        className="text-4xl sm:text-6xl text-white font-normal leading-tight tracking-tight drop-shadow-md"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {title}{' '}
        {highlightWord && (
          <span className="text-cyan-300 italic">{highlightWord}</span>
        )}{' '}
        {titleEnd}
      </h1>
      {subtitle && (
        <p className="mt-4 text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}

