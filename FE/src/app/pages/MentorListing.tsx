import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { Search, Sparkles, SlidersHorizontal, Loader2, RotateCcw, GraduationCap, Globe2 } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { MentorCard } from '../components/MentorCard';
import { EditorialPageHeader } from '../components/EditorialPageHeader';
import { GsapTypewriter } from '../components/GsapTypewriter';
import { MouseFollowLight } from '../components/MouseFollowLight';
import { EmptyState } from '../components/common';
import { majors, formatCurrency, type Mentor } from '../data/mockData';
import { useLanguage } from '../context/LanguageContext';
import { useUniversity } from '../context/UniversityContext';
import { FormattedText } from '../components/FormattedText';
import { searchMentors, backendToMentor } from '../services/mentorService';
import { getUniversity, type UniversityResponse } from '../services/universityService';
import { mentorMatch, type MentorMatchResult } from '../services/aiService';
import { toast } from 'sonner';

const roles = ['Senior Student', 'Alumni Mentor', 'Lecturer', 'Research Advisor'];
const PAGE_SIZE = 24;

export function MentorListing() {
  const { T, lang } = useLanguage();
  const { code: routeCode } = useParams();
  const { universities, selectedCode, setSelectedCode } = useUniversity();

  // The university filter actually in effect: locked to the route param when present.
  const activeCode = routeCode ?? selectedCode;

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('rating');
  const [selectedMajor, setSelectedMajor] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [maxPrice, setMaxPrice] = useState(150000);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [lockedUni, setLockedUni] = useState<UniversityResponse | null>(null);
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<MentorMatchResult | null>(null);

  // When arriving via /truong/:code, resolve that university (any status, incl. WAITLIST).
  useEffect(() => {
    if (!routeCode) { setLockedUni(null); return; }
    getUniversity(routeCode).then(setLockedUni).catch(() => setLockedUni(null));
  }, [routeCode]);

  const runAdvisor = async (overrideQuery?: string) => {
    const textToRun = (overrideQuery ?? aiQuery).trim();
    if (!textToRun) return;
    if (overrideQuery) setAiQuery(overrideQuery);
    setAiLoading(true);
    try {
      setAiResult(await mentorMatch(textToRun));
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? (lang === 'vi' ? 'Không tư vấn được. Vui lòng thử lại.' : 'Could not get advisor recommendations.'));
    } finally {
      setAiLoading(false);
    }
  };

  // Server-side search — refetch whenever the university or major filter changes.
  useEffect(() => {
    setLoading(true);
    searchMentors({
      university: activeCode ?? undefined,
      major: selectedMajor === 'all' ? undefined : selectedMajor,
      size: PAGE_SIZE,
    })
      .then((pageRes) => {
        setMentors(pageRes.items.map(backendToMentor));
        setTotal(pageRes.total);
      })
      .catch(() => { setMentors([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [activeCode, selectedMajor]);

  // Remaining refinements (free text, role, price, sort) are applied over the fetched page.
  const visible = mentors
    .filter((m) => {
      const q = query.toLowerCase();
      const matchesQuery =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.major.toLowerCase().includes(q) ||
        m.university.toLowerCase().includes(q) ||
        m.courses.some((c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
      const matchesRole = selectedRole === 'all' || m.role === selectedRole;
      const matchesPrice = m.hourlyRate <= maxPrice;
      return matchesQuery && matchesRole && matchesPrice;
    })
    .sort((a, b) => {
      if (sort === 'rating') return b.rating - a.rating;
      if (sort === 'priceLow') return a.hourlyRate - b.hourlyRate;
      if (sort === 'priceHigh') return b.hourlyRate - a.hourlyRate;
      if (sort === 'sessions') return b.sessionsCompleted - a.sessionsCompleted;
      return 0;
    });

  const reset = () => {
    setSelectedMajor('all');
    setSelectedRole('all');
    setMaxPrice(150000);
    setQuery('');
  };

  const activeUniversity =
    lockedUni ?? universities.find((u) => u.code === activeCode) ?? null;
  const uniName = activeUniversity?.shortName || activeUniversity?.name || activeCode || '';
  const t = (key: string, uni: string) => (T as any)[key]?.replace('{university}', uni) ?? '';

  // Coming-soon state: a chosen university that is on the waitlist or has no mentors yet.
  const showComingSoon =
    !loading &&
    !!activeUniversity &&
    (activeUniversity.status === 'WAITLIST' || total === 0);

  return (
    <div className="relative z-10 pb-24 text-slate-100 min-h-screen">
      <MouseFollowLight />

      <EditorialPageHeader
        eyebrow={lang === 'vi' ? 'HỆ THỐNG CỐ VẤN DYNFORGE' : 'DYNFORGE ACADEMIC MENTORING'}
        title={
          lang === 'vi' ? (
            <GsapTypewriter key="vi" prefix="Tìm gia sư " highlight="phù hợp." duration={2} />
          ) : (
            <GsapTypewriter key="en" prefix="Find your " highlight="mentor." duration={2} />
          )
        }
        subtitle={
          lang === 'vi'
            ? 'Kết nối cùng anh chị gia sư uy tín thấu hiểu môn học, đồ án và lộ trình học tập của bạn.'
            : 'Connect with experienced student mentors, alumni, and lecturers who understand your courses and projects.'
        }
      />

      <div className="max-w-6xl mx-auto px-6 space-y-8">
        {/* Floating Search Bar */}
        <div className="relative max-w-2xl mx-auto">
          <div className="flex items-center rounded-full border border-white/20 bg-[#090f1e]/80 backdrop-blur-xl p-1.5 shadow-2xl transition-all focus-within:border-cyan-400/60 focus-within:ring-2 focus-within:ring-cyan-500/20">
            <Search className="size-5 text-slate-400 ml-4 mr-2 shrink-0" />
            <input
              type="text"
              placeholder={lang === 'vi' ? 'Tìm theo mã môn (PRJ301, CSD201...), tên gia sư, chuyên ngành...' : 'Search by course code (PRJ301...), mentor name, major...'}
              className="w-full bg-transparent border-none text-white placeholder:text-slate-500 outline-none text-sm py-2"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button onClick={() => setQuery('')} className="px-3 py-1 text-xs text-slate-400 hover:text-white transition-colors">
                {lang === 'vi' ? 'Xóa' : 'Clear'}
              </button>
            )}
          </div>
        </div>

        {/* Compact Floating Horizontal Filter Bar */}
        <div className="rounded-2xl border border-white/10 bg-[#090f1e]/60 backdrop-blur-md p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2">
              <SlidersHorizontal className="size-4 text-cyan-400" />
              <span>{lang === 'vi' ? 'Bộ lọc' : 'Filters'}</span>
            </div>

            {/* University Filter */}
            <Select
              value={activeCode ?? 'all'}
              onValueChange={(v) => setSelectedCode(v === 'all' ? null : v)}
              disabled={!!routeCode}
            >
              <SelectTrigger className="w-[200px] bg-white/5 border-white/10 text-white text-xs rounded-xl h-9">
                <GraduationCap className="size-3.5 text-cyan-400 mr-1 shrink-0" />
                <SelectValue placeholder={T.selectUniversity} />
              </SelectTrigger>
              <SelectContent className="bg-[#090f1e] text-white border-white/10">
                <SelectItem value="all">{T.allUniversities}</SelectItem>
                {universities.map((u) => (
                  <SelectItem key={u.code} value={u.code}>{u.shortName || u.name}</SelectItem>
                ))}
                {/* Ensure a locked waitlist university is still shown as selected */}
                {lockedUni && !universities.some((u) => u.code === lockedUni.code) && (
                  <SelectItem value={lockedUni.code}>{lockedUni.shortName || lockedUni.name}</SelectItem>
                )}
              </SelectContent>
            </Select>

            {/* Major Filter */}
            <Select value={selectedMajor} onValueChange={setSelectedMajor}>
              <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white text-xs rounded-xl h-9">
                <SelectValue placeholder={lang === 'vi' ? 'Chuyên ngành' : 'All Majors'} />
              </SelectTrigger>
              <SelectContent className="bg-[#090f1e] text-white border-white/10">
                <SelectItem value="all">{lang === 'vi' ? 'Tất cả Chuyên ngành' : 'All Majors'}</SelectItem>
                {majors.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Role Filter */}
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-[160px] bg-white/5 border-white/10 text-white text-xs rounded-xl h-9">
                <SelectValue placeholder={lang === 'vi' ? 'Loại gia sư' : 'All Roles'} />
              </SelectTrigger>
              <SelectContent className="bg-[#090f1e] text-white border-white/10">
                <SelectItem value="all">{lang === 'vi' ? 'Tất cả Loại gia sư' : 'All Roles'}</SelectItem>
                {roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Max Price Range Slider */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-xs text-slate-300">
              <span>{lang === 'vi' ? 'Tối đa:' : 'Max:'}</span>
              <span className="font-semibold text-cyan-300">{formatCurrency(maxPrice)}</span>
              <input
                type="range" min="50000" max="250000" step="10000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-24 accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Sort & Reset */}
          <div className="flex items-center gap-3">
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-[150px] bg-white/5 border-white/10 text-white text-xs rounded-xl h-9">
                <SelectValue placeholder={lang === 'vi' ? 'Sắp xếp' : 'Sort'} />
              </SelectTrigger>
              <SelectContent className="bg-[#090f1e] text-white border-white/10">
                <SelectItem value="rating">{lang === 'vi' ? 'Đánh giá cao nhất' : 'Top Rated'}</SelectItem>
                <SelectItem value="priceLow">{lang === 'vi' ? 'Giá thấp đến cao' : 'Price: Low to High'}</SelectItem>
                <SelectItem value="priceHigh">{lang === 'vi' ? 'Giá cao đến thấp' : 'Price: High to Low'}</SelectItem>
                <SelectItem value="sessions">{lang === 'vi' ? 'Nhiều buổi dạy nhất' : 'Most Sessions'}</SelectItem>
              </SelectContent>
            </Select>

            <button
              onClick={reset}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-2"
            >
              <RotateCcw className="size-3.5" />
              <span>{lang === 'vi' ? 'Đặt lại' : 'Reset'}</span>
            </button>
          </div>
        </div>

        {/* When a university filter is active, offer to broaden to all schools */}
        {activeCode && !routeCode && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-300">
            <span className="flex items-center gap-2">
              <Globe2 className="size-4 text-cyan-400" />
              {T.generalEducationNote}
            </span>
            <button
              onClick={() => setSelectedCode(null)}
              className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 font-medium text-cyan-300 hover:bg-cyan-500/20 transition-colors"
            >
              {T.showMentorsFromOtherSchools}
            </button>
          </div>
        )}

        {/* AI Mentor Advisor Floating Section */}
        <div className="rounded-2xl border border-white/10 bg-[#090f1e]/70 backdrop-blur-md p-6 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                {lang === 'vi' ? 'Tư vấn chọn Gia sư bằng AI' : 'AI Mentor Advisor'}
              </h3>
            </div>
            <span className="text-xs text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full">
              {lang === 'vi' ? 'Thông minh' : 'Smart AI'}
            </span>
          </div>

          <p className="text-xs text-slate-400 mb-4">
            {lang === 'vi'
              ? 'Mô tả nhu cầu học tập của bạn (môn học, dự án, thời gian chuẩn bị), AI sẽ gợi ý gia sư phù hợp nhất.'
              : 'Describe your learning goals, course difficulties, or project prep, and AI will suggest top mentors.'}
          </p>

          <div className="flex gap-3">
            <Input
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runAdvisor()}
              placeholder={lang === 'vi' ? 'VD: Mình đang rớt Giải tích 1, cần luyện thi cuối kỳ trong 2 tuần...' : 'e.g., Need help passing Java PRJ301 project in 2 weeks...'}
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 text-sm rounded-xl h-11"
            />
            <Button
              onClick={() => runAdvisor()}
              disabled={aiLoading}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-xl h-11 px-6 shrink-0"
            >
              {aiLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 mr-2" />}
              {lang === 'vi' ? 'Tư vấn AI' : 'Ask AI'}
            </Button>
          </div>

          {aiResult && (
            <div className="mt-5 pt-5 border-t border-white/10 text-xs text-slate-300 space-y-3">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="font-semibold text-cyan-300 mb-1">{lang === 'vi' ? 'Gợi ý từ AI:' : 'AI Advice:'}</p>
                <p className="leading-relaxed"><FormattedText text={aiResult.advice} /></p>
              </div>
            </div>
          )}
        </div>

        {/* Results Metadata & Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              {lang === 'vi' ? `Tìm thấy ${visible.length} gia sư` : `Found ${visible.length} mentor(s)`}
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-8 text-cyan-400 animate-spin" />
            </div>
          ) : showComingSoon ? (
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-10 text-center">
              <GraduationCap className="mx-auto size-10 text-cyan-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">{t('comingSoonAtUniversity', uniName)}</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">{T.generalEducationNote}</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  onClick={() => toast.success(t('comingSoonAtUniversity', uniName))}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl h-10 px-5"
                >
                  {T.joinWaitlist}
                </Button>
                <button
                  onClick={() => setSelectedCode(null)}
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-slate-200 hover:bg-white/10 transition-colors"
                >
                  {T.showMentorsFromOtherSchools}
                </button>
              </div>
            </div>
          ) : visible.length === 0 ? (
            <EmptyState
              title={lang === 'vi' ? 'Không tìm thấy gia sư phù hợp' : 'No mentors match your filters'}
              description={lang === 'vi' ? 'Thử mở rộng giá hoặc đổi từ khóa tìm kiếm.' : 'Try widening your price range or removing some filters.'}
              actionLabel={lang === 'vi' ? 'Xóa bộ lọc' : 'Reset filters'}
              onAction={reset}
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((m) => (
                <div key={m.id} className="rounded-2xl border border-white/10 bg-[#090f1e]/60 backdrop-blur-md p-1 shadow-xl hover:border-cyan-500/40 transition-all">
                  <MentorCard mentor={m} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
