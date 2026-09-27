import { useState } from 'react';
import { Link } from 'react-router';
import {
  Megaphone, BarChart3, Users, Star, Check, Mail, ArrowRight,
  ShieldCheck, CreditCard, Target,
} from 'lucide-react';
import { Logo } from '../Logo';
import {
  Dialog, DialogContent, DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { useLanguage } from '../../context/LanguageContext';

type BillingCycle = 'monthly' | 'yearly';

interface AdPlan {
  name: string;
  monthlyPrice: number | null; // null = custom
  color: string;
  badge: string | null;
  badgeColor: string;
  description: string;
  features: string[];
  cta: string;
  highlight: boolean;
}

const adPlans: AdPlan[] = [
  {
    name: 'Starter',
    monthlyPrice: 2500000,
    color: 'border-slate-800',
    badge: null,
    badgeColor: '',
    description: 'Phù hợp cho thương hiệu nhỏ và startup muốn tiếp cận thị trường sinh viên.',
    features: [
      'Banner quảng cáo trên trang Tìm gia sư',
      'Tối đa 10.000 lượt hiển thị / tháng',
      'Link trực tiếp đến landing page của bạn',
      'Báo cáo hiệu suất hàng tháng',
    ],
    cta: 'Bắt đầu ngay',
    highlight: false,
  },
  {
    name: 'Growth',
    monthlyPrice: 6000000,
    color: 'border-cyan-500',
    badge: 'Phổ biến nhất',
    badgeColor: 'bg-cyan-600',
    description: 'Lý tưởng cho thương hiệu muốn tiếp cận sinh viên FPTU theo quy mô lớn.',
    features: [
      'Banner + thẻ tài trợ in-feed',
      'Tối đa 50.000 lượt hiển thị / tháng',
      'Vị trí nổi bật trên trang chủ',
      'Badge tài trợ trên hồ sơ gia sư',
      'Dashboard phân tích 2 tuần / lần',
      'Account manager riêng',
    ],
    cta: 'Bắt đầu ngay',
    highlight: true,
  },
  {
    name: 'Enterprise',
    monthlyPrice: null,
    color: 'border-slate-700',
    badge: 'Doanh nghiệp lớn',
    badgeColor: 'bg-slate-800',
    description: 'Tích hợp toàn nền tảng dành cho đối tác doanh nghiệp và trường đại học.',
    features: [
      'Tất cả tính năng Growth',
      'Tài nguyên & nội dung được tài trợ',
      'Sự kiện mentor đồng thương hiệu',
      'Đặt quảng cáo trong email newsletter',
      'Chiến lược campaign tùy chỉnh',
      'Hỗ trợ ưu tiên & SLA',
    ],
    cta: 'Liên hệ tư vấn',
    highlight: false,
  },
];

function formatVND(n: number) {
  return new Intl.NumberFormat('vi-VN').format(n) + '₫';
}

const stats = [
  { icon: Users, value: '12,000+', label: 'Monthly active students' },
  { icon: BarChart3, value: '85%', label: 'Engagement rate on ads' },
  { icon: Star, value: '4.9/5', label: 'Partner satisfaction' },
  { icon: Megaphone, value: '40+', label: 'Universities reached' },
];

function PartnershipModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<'plans' | 'contact'>('plans');
  const [selectedPlan, setSelectedPlan] = useState('Growth');
  const [billing, setBilling] = useState<BillingCycle>('monthly');

  const getPrice = (plan: AdPlan) => {
    if (!plan.monthlyPrice) return null;
    return billing === 'yearly'
      ? Math.round(plan.monthlyPrice * 10)
      : plan.monthlyPrice;
  };

  const getPerMonth = (plan: AdPlan) => {
    if (!plan.monthlyPrice) return null;
    return billing === 'yearly'
      ? Math.round((plan.monthlyPrice * 10) / 12)
      : plan.monthlyPrice;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Yêu cầu hợp tác đã được gửi! Chúng tôi sẽ liên hệ trong vòng 1–2 ngày làm việc.');
    onClose();
    setTimeout(() => setStep('plans'), 300);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 bg-slate-900 border-slate-800 text-slate-100" aria-describedby={undefined}>
        <div className="sticky top-0 z-10 rounded-t-lg border-b border-slate-800 bg-slate-900 px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-base text-white">
            <span className="flex size-7 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
              <Megaphone className="size-4" />
            </span>
            {step === 'plans' ? 'Quảng cáo & Hợp tác với DynForge' : `Đăng ký gói ${selectedPlan}`}
          </DialogTitle>
        </div>

        <div className="px-6 pb-6 pt-5">
          {step === 'plans' ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="mb-3 text-sm text-slate-300">
                  Tiếp cận <strong className="text-white font-semibold">12.000+ sinh viên</strong> đang chủ động tìm kiếm tài nguyên học thuật và cố vấn.
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {stats.map(({ icon: Icon, value, label }) => (
                    <div key={label} className="flex flex-col items-center rounded-xl border border-slate-800 bg-slate-900 px-2 py-3 text-center">
                      <Icon className="mb-1 size-4 text-cyan-400" />
                      <p className="font-bold text-white text-base leading-tight">{value}</p>
                      <p className="mt-0.5 text-xs text-slate-400 leading-tight">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setBilling('monthly')}
                  className={`rounded-l-full border px-5 py-2 text-sm font-medium transition-colors ${billing === 'monthly' ? 'border-cyan-500 bg-cyan-600 text-white' : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900'}`}
                >
                  Theo tháng
                </button>
                <button
                  onClick={() => setBilling('yearly')}
                  className={`relative rounded-r-full border px-5 py-2 text-sm font-medium transition-colors ${billing === 'yearly' ? 'border-cyan-500 bg-cyan-600 text-white' : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900'}`}
                >
                  Theo năm
                  <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${billing === 'yearly' ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-300'}`}>
                    -17%
                  </span>
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {adPlans.map((plan) => {
                  const price = getPrice(plan);
                  const perMonth = getPerMonth(plan);
                  const selected = selectedPlan === plan.name;
                  return (
                    <div
                      key={plan.name}
                      onClick={() => setSelectedPlan(plan.name)}
                      className={`relative flex cursor-pointer flex-col rounded-2xl border-2 p-5 transition-all ${plan.color} ${selected ? 'border-cyan-500 bg-slate-900 shadow-xl ring-2 ring-cyan-500/30' : 'bg-slate-950 hover:border-slate-700'}`}
                    >
                      {plan.badge && (
                        <span className={`absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-0.5 text-xs font-semibold text-white ${plan.badgeColor}`}>
                          {plan.badge}
                        </span>
                      )}
                      {selected && (
                        <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-cyan-500 text-white">
                          <Check className="size-3" />
                        </span>
                      )}
                      <p className="font-bold text-white text-lg">{plan.name}</p>
                      <div className="mt-2 min-h-[3.5rem]">
                        {price !== null ? (
                          <>
                            <div className="flex items-baseline gap-1">
                              <span className="text-xl font-extrabold text-white leading-tight">
                                {formatVND(price)}
                              </span>
                              <span className="text-xs text-slate-400">
                                /{billing === 'yearly' ? 'năm' : 'tháng'}
                              </span>
                            </div>
                          </>
                        ) : (
                          <span className="text-xl font-extrabold text-white">Liên hệ</span>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-slate-400 leading-snug">{plan.description}</p>
                      <ul className="mt-3 flex-1 space-y-1.5">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-start gap-1.5 text-xs text-slate-300">
                            <Check className="mt-0.5 size-3 shrink-0 text-cyan-400" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-400">
                  Đã chọn: <strong className="text-white">{selectedPlan}</strong>
                </p>
                <Button onClick={() => setStep('contact')} className="shrink-0 gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white">
                  Tiếp tục <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block text-slate-300">Tên công ty / thương hiệu</Label>
                  <Input placeholder="vd: FPT Software" className="bg-slate-950 border-slate-800 text-white" required />
                </div>
                <div>
                  <Label className="mb-1.5 block text-slate-300">Người liên hệ</Label>
                  <Input placeholder="Họ và tên" className="bg-slate-950 border-slate-800 text-white" required />
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                <Button type="button" variant="outline" onClick={() => setStep('plans')} className="border-slate-800 text-slate-300 hover:bg-slate-800">Quay lại</Button>
                <Button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white">Gửi yêu cầu hợp tác</Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function Footer() {
  const [showPartner, setShowPartner] = useState(false);
  const { T, lang } = useLanguage();

  const trustBadges = [
    {
      icon: ShieldCheck,
      title: 'Verified Mentors',
      desc: lang === 'vi' ? '100% gia sư được kiểm định hồ sơ & học vấn' : 'Identity & credentials verified',
    },
    {
      icon: Star,
      title: 'Real Student Reviews',
      desc: lang === 'vi' ? 'Đánh giá thực tế từ sinh viên sau buổi học' : 'Authentic feedback from real sessions',
    },
    {
      icon: CreditCard,
      title: 'Secure Escrow Payment',
      desc: lang === 'vi' ? 'Học phí ký quỹ an toàn đến khi hoàn tất' : 'Funds held safely in escrow until done',
    },
    {
      icon: Target,
      title: 'Course-Based Matching',
      desc: lang === 'vi' ? 'Ghép nối chính xác theo mã môn & giáo trình' : 'Matched by university course code',
    },
  ];

  const dynamicColumns = [
    {
      title: T.platform,
      links: [
        { label: T.findMentors, to: '/mentors' },
        { label: T.becomeMentor, to: '/become-a-mentor' },
        { label: T.resources, to: '/resources' },
        { label: T.about, to: '/about' },
      ],
    },
    {
      title: T.trustSafety,
      links: [
        { label: T.escrowProtection, to: '/about' },
        { label: T.mentorVerificationLink, to: '/become-a-mentor' },
        { label: T.disputeResolution, to: '/dashboard' },
        { label: T.communityGuidelines, to: '/about' },
      ],
    },
    {
      title: T.company,
      links: [
        { label: T.aboutDynForge, to: '/about' },
        { label: T.careers, to: '/about' },
        { label: T.contact, to: '/support/contact' },
        { label: T.admin, to: '/admin' },
      ],
    },
  ];

  return (
    <>
      {/* ── TRUST BADGES BAND (Moved to Footer) ───────────────────────── */}
      <section className="relative z-10 border-t border-white/10 bg-slate-950/60 backdrop-blur-md py-8">
        <div className="mx-auto max-w-[1240px] px-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {trustBadges.map((badge, idx) => {
              const Icon = badge.icon;
              return (
                <div
                  key={idx}
                  className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-all duration-300 hover:border-cyan-500/40 hover:bg-white/10"
                >
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 group-hover:scale-110 transition-transform">
                    <Icon className="size-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm tracking-wide">
                      {badge.title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                      {badge.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Partnership banner */}
      <div className="border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
        <div className="mx-auto max-w-[1240px] px-5 py-10">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Megaphone className="size-5 text-cyan-400" />
                <span className="text-xs text-cyan-400 uppercase tracking-widest font-semibold">
                  {T.footerForBusinesses}
                </span>
              </div>
              <h3 className="text-white text-xl font-semibold">
                {T.footerPartnerTitle}
              </h3>
              <p className="mt-1 text-sm text-slate-400 max-w-lg">
                {T.footerPartnerDesc}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:shrink-0">
              <Button
                onClick={() => setShowPartner(true)}
                className="liquid-glass border border-cyan-400/30 bg-cyan-600/30 text-white hover:bg-cyan-600/40 gap-2 font-medium"
              >
                <Megaphone className="size-4" /> {T.viewAdvertisingPlans}
              </Button>
              <p className="text-center text-xs text-slate-500">{T.noCommitment}</p>
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-slate-800/80 bg-slate-950/70 backdrop-blur-md text-slate-300">
        <div className="mx-auto max-w-[1240px] px-5 py-14">
          <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div>
              <Logo light showTagline size="md" />
              <p className="mt-4 max-w-xs text-sm text-slate-400 leading-relaxed">
                {T.footerTagline}
              </p>
              <button
                onClick={() => setShowPartner(true)}
                className="mt-4 flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 font-medium"
              >
                <Megaphone className="size-3.5" /> {T.partnerWithUs}
              </button>
            </div>
            {dynamicColumns.map((col) => (
              <div key={col.title}>
                <h4 className="mb-3 font-semibold text-white">
                  {col.title}
                </h4>
                <ul className="flex flex-col gap-2">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="text-sm text-slate-400 transition-colors hover:text-cyan-300"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-slate-800/80 pt-6 text-sm text-slate-400 sm:flex-row">
            <span>{T.copyright}</span>
            <span className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <Link to="/privacy" className="hover:text-cyan-300">{lang === 'vi' ? 'Chính sách bảo mật' : 'Privacy'}</Link>
              <Link to="/terms" className="hover:text-cyan-300">{lang === 'vi' ? 'Điều khoản' : 'Terms'}</Link>
              <Link to="/delete-account" className="hover:text-cyan-300">{lang === 'vi' ? 'Xoá tài khoản' : 'Delete account'}</Link>
            </span>
            <span>{T.paymentsSecured}</span>
          </div>
        </div>
      </footer>

      <PartnershipModal open={showPartner} onClose={() => setShowPartner(false)} />
    </>
  );
}
