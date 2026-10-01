import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { ChevronLeft, ChevronRight, ShieldCheck, Video, MapPin, Loader2 } from 'lucide-react';
import { getMentor, formatCurrency, type Mentor } from '../data/mockData';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Card } from '../components/ui/card';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { cn } from '../components/ui/utils';
import { EditorialPageHeader } from '../components/EditorialPageHeader';
import { GsapTypewriter } from '../components/GsapTypewriter';
import { MouseFollowLight } from '../components/MouseFollowLight';
import { GsapCounter } from '../components/GsapCounter';
import { getMentorById, isObjectId, backendToMentor } from '../services/mentorService';
import { isNativeApp } from '../lib/platform';

const durations = [30, 45, 60, 90];
const customDurations = [120, 180, 240];

export function ScheduleConsultation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { T, lang } = useLanguage();

  const [monthOffset, setMonthOffset] = useState(0);
  const [duration, setDuration] = useState(60);
  const [showCustom, setShowCustom] = useState(false);
  const [bookingFormat, setBookingFormat] = useState<'ONE_ON_ONE' | 'GROUP'>('ONE_ON_ONE');
  const [displayMode, setDisplayMode] = useState<string>('');
  const [sessionFormat, setSessionFormat] = useState<'Online' | 'Offline'>('Online');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [realMentorUserId, setRealMentorUserId] = useState<string | null>(null);
  const [backendMentor, setBackendMentor] = useState<Mentor | undefined>(undefined);
  const [mentorLoading, setMentorLoading] = useState(isObjectId(id ?? ''));

  useEffect(() => {
    if (!user) navigate(`/login?redirect=/mentors/${id}/schedule`);
  }, [user, navigate, id]);

  useEffect(() => {
    if (!displayMode && T.oneOnOne) setDisplayMode(T.oneOnOne);
  }, [T.oneOnOne, displayMode]);

  useEffect(() => {
    if (!id || !isObjectId(id)) return;
    setMentorLoading(true);
    getMentorById(id)
      .then((profile) => {
        setRealMentorUserId(profile.userId);
        setBackendMentor(backendToMentor(profile));
      })
      .catch(() => { /* fall back to mockData mentor */ })
      .finally(() => setMentorLoading(false));
  }, [id]);

  const mockMentor = getMentor(id);
  const mentor = backendMentor ?? mockMentor;

  useEffect(() => {
    if (mentor && mentor.courses && mentor.courses.length > 0 && !selectedCourse) {
      setSelectedCourse(mentor.courses[0].code);
    }
  }, [mentor, selectedCourse]);

  if (mentorLoading) {
    return (
      <div className="bg-[#020B18] min-h-screen flex items-center justify-center py-32 text-slate-400 gap-2">
        <Loader2 className="size-5 animate-spin text-cyan-400" /> Loading booking calendar…
      </div>
    );
  }

  if (!mentor) {
    return (
      <div className="bg-[#020B18] min-h-screen mx-auto max-w-[1240px] px-5 py-20 text-center text-slate-100">
        <h1 className="text-3xl font-bold">{T.mentorNotFound}</h1>
        <Link to="/mentors" className="mt-4 inline-block liquid-glass rounded-full px-6 py-2.5 text-sm font-medium text-white border border-cyan-400/40 bg-cyan-600/30">{T.backToMentors}</Link>
      </div>
    );
  }

  const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
  const mentorAvatar = mentor.avatar?.trim() ? mentor.avatar : defaultAvatar;

  // The Android app only sells live 1:1 sessions (Google Play payments policy), so group booking is web-only.
  const learningModes = [
    { label: T.oneOnOne, format: 'ONE_ON_ONE' as const },
    { label: T.smallGroup || T.group, format: 'GROUP' as const },
  ].filter((m) => !isNativeApp() || m.format === 'ONE_ON_ONE');

  const timeSlots = ['08:00', '09:30', '11:00', '13:30', '15:00', '16:30', '19:00', '20:30'];

  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);

  const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const firstWeekday = new Date(base.getFullYear(), base.getMonth(), 1).getDay();
  const todayDay = monthOffset === 0 ? now.getDate() : 0;

  // A slot that already started (or starts within 15 minutes) cannot be booked: the backend requires a future start time.
  const isSlotPast = (slot: string) => {
    if (monthOffset !== 0 || selectedDay !== now.getDate()) return false;
    const [h, m] = slot.split(':').map(Number);
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
    return start.getTime() - now.getTime() < 15 * 60 * 1000;
  };
  const slotUnavailable = !!selectedSlot && isSlotPast(selectedSlot);

  const chosenCourse = mentor.courses?.find((c) => c.code.toLowerCase() === (selectedCourse || '').toLowerCase());
  const courseHourlyRate = chosenCourse?.ratePrivate ?? mentor.hourlyRate;
  const courseGroupRate = chosenCourse?.rateGroup ?? mentor.groupRate;
  const activeRate = bookingFormat === 'GROUP' ? courseGroupRate : courseHourlyRate;
  const price = Math.round((activeRate * duration) / 60);

  const cont = () => {
    const mentorId = realMentorUserId ?? mentor.id;
    navigate(`/mentors/${mentor.id}/order`, {
      state: {
        duration,
        displayMode,
        bookingFormat,
        sessionFormat,
        day: selectedDay,
        month: base.getMonth(),
        year: base.getFullYear(),
        slot: selectedSlot,
        price,
        courseCode: selectedCourse,
        mentorId,
      },
    });
  };

  return (
    <div className="relative z-10 pb-24 text-slate-100 min-h-screen">
      <MouseFollowLight />

      {/* Editorial Page Header */}
      <EditorialPageHeader
        eyebrow={lang === 'vi' ? 'ĐẶT LỊCH HỌC DYNFORGE' : 'BOOK A DYNFORGE SESSION'}
        title={
          lang === 'vi' ? (
            <GsapTypewriter
              key="schedule-vi"
              prefix="Lên lịch tư vấn "
              highlight="học tập."
              duration={2}
            />
          ) : (
            <GsapTypewriter
              key="schedule-en"
              prefix="Schedule your "
              highlight="consultation."
              duration={2}
            />
          )
        }
        subtitle={lang === 'vi' ? 'Chọn môn học, thời lượng, ngày và khung giờ học phù hợp nhất với bạn.' : 'Pick your course, duration, date, and preferred time slot.'}
      />

      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
          {/* Summary sidebar (Dark Glass) */}
          <aside className="lg:sticky lg:top-[88px] lg:h-fit order-last lg:order-first">
            <Card className="border border-white/10 bg-[#090f1e]/80 backdrop-blur-xl p-6 text-slate-100 shadow-2xl rounded-3xl">
              <div className="flex items-center gap-3">
                <ImageWithFallback src={mentorAvatar} alt={mentor.name} className="size-14 rounded-2xl object-cover border border-white/15" />
                <div>
                  <p className="font-semibold text-white text-base">{mentor.name}</p>
                  <p className="text-sm text-cyan-300 font-medium">{mentor.role}</p>
                </div>
              </div>

              <div className="mt-5 space-y-4 border-t border-white/10 pt-4">
                {/* Learning mode */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{T.learningMode}</p>
                  <div className="flex flex-wrap gap-2">
                    {learningModes.map(({ label, format }) => (
                      <button
                        key={label}
                        onClick={() => { setDisplayMode(label); setBookingFormat(format); }}
                        className={cn(
                          'rounded-xl border px-3.5 py-1.5 text-xs font-medium transition-all cursor-pointer',
                          displayMode === label
                            ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 font-semibold shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                            : 'border-white/10 bg-white/5 text-slate-300 hover:border-cyan-500/30 hover:bg-white/10'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Session format (Online / Offline) */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{T.format}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Online', 'Offline'] as const).map((f) => {
                      const label = f === 'Online' ? T.online : T.offline;
                      const Icon = f === 'Online' ? Video : MapPin;
                      return (
                        <button
                          key={f}
                          onClick={() => setSessionFormat(f)}
                          className={cn(
                            'flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all cursor-pointer',
                            sessionFormat === f
                              ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 font-semibold shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                              : 'border-white/10 bg-white/5 text-slate-300 hover:border-cyan-500/30 hover:bg-white/10'
                          )}
                        >
                          <Icon className="size-3.5" /> {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Course selector */}
                {mentor.courses && mentor.courses.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Course</p>
                    <div className="flex flex-wrap gap-2">
                      {mentor.courses.map((c) => (
                        <button
                          key={c.code}
                          onClick={() => setSelectedCourse(c.code)}
                          className={cn(
                            'rounded-xl border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer',
                            selectedCourse === c.code
                              ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 font-semibold shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                              : 'border-white/10 bg-white/5 text-slate-300 hover:border-cyan-500/30 hover:bg-white/10'
                          )}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-xs">
                <SummaryRow label={T.sessionType} value={displayMode} />
                <SummaryRow label={T.duration} value={duration >= 120 ? `${duration / 60}h (${duration} min)` : `${duration} min`} />
                <SummaryRow
                  label={T.date}
                  value={selectedDay ? `${selectedDay} ${base.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', { month: 'short' })}` : '—'}
                />
                <SummaryRow label={T.time} value={selectedSlot ?? '—'} />
                {selectedCourse && <SummaryRow label="Course" value={selectedCourse} />}
              </div>

              <div className="mt-4 border-t border-white/10 pt-4">
                <div className="mb-3 rounded-2xl border border-white/10 bg-[#020b18]/80 px-3.5 py-3 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className={cn('text-slate-400', bookingFormat === 'GROUP' && 'text-cyan-300 font-semibold')}>
                      {T.groupRate}
                    </span>
                    <span className={cn('font-semibold', bookingFormat === 'GROUP' ? 'text-cyan-300' : 'text-slate-400')}>
                      {formatCurrency(courseGroupRate)}/hr
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={cn('text-slate-400', bookingFormat === 'ONE_ON_ONE' && 'text-cyan-300 font-semibold')}>
                      {T.oneOnOneRate}
                    </span>
                    <span className={cn('font-semibold', bookingFormat === 'ONE_ON_ONE' ? 'text-cyan-300' : 'text-slate-400')}>
                      {formatCurrency(courseHourlyRate)}/hr
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-baseline justify-between px-1">
                    <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                      {T.estimatedTotal}
                    </span>
                    <span className="text-2xl font-black text-cyan-300">
                      <GsapCounter targetValue={price} suffix=" ₫" duration={1.2} />
                    </span>
                  </div>

                  <Button
                    onClick={cont}
                    disabled={!selectedDay || !selectedSlot || slotUnavailable}
                    className="w-full py-3 h-12 text-sm font-semibold rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 disabled:opacity-40 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                  >
                    {T.continueToOrder}
                  </Button>

                  <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                    <span className="leading-relaxed">{T.escrowProtectedNotice}</span>
                  </div>
                </div>
              </div>
            </Card>
          </aside>

          {/* Main selection area */}
          <div className="space-y-6">
            {/* Step 1: Duration */}
            <Card className="border border-white/10 bg-[#090f1e]/80 backdrop-blur-xl p-6 sm:p-8 text-slate-100 shadow-2xl rounded-3xl">
              <div className="flex items-center gap-3 mb-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs font-bold text-cyan-300">
                  01
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {T.stepDuration}
                </h2>
              </div>
              <p className="mb-5 text-sm text-slate-400 leading-relaxed">
                {T.stepDurationDesc}
              </p>
              <div className="flex flex-wrap gap-3">
                {durations.map((d) => (
                  <button
                    key={d}
                    onClick={() => { setDuration(d); setShowCustom(false); }}
                    className={cn(
                      'rounded-xl border px-5 py-2.5 text-sm font-medium transition-all cursor-pointer',
                      duration === d && !showCustom
                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 font-semibold shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:border-cyan-400/40 hover:bg-white/10'
                    )}
                  >
                    {d} min
                  </button>
                ))}
                <button
                  onClick={() => setShowCustom(true)}
                  className={cn(
                    'rounded-xl border px-5 py-2.5 text-sm font-medium transition-all cursor-pointer',
                    showCustom
                      ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 font-semibold shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:border-cyan-400/40 hover:bg-white/10'
                  )}
                >
                  {T.customDuration}
                </button>
              </div>

              {showCustom && (
                <div className="mt-4 flex flex-wrap gap-2.5 border-t border-white/10 pt-4">
                  {customDurations.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={cn(
                        'rounded-xl border px-4 py-2 text-xs font-medium transition-all cursor-pointer',
                        duration === d
                          ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 font-semibold shadow-md'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-cyan-400/40 hover:bg-white/10'
                      )}
                    >
                      {d / 60}h ({d} min)
                    </button>
                  ))}
                </div>
              )}
            </Card>

            {/* Step 2: Date */}
            <Card className="border border-white/10 bg-[#090f1e]/80 backdrop-blur-xl p-6 sm:p-8 text-slate-100 shadow-2xl rounded-3xl">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs font-bold text-cyan-300">
                    02
                  </span>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                      {T.stepDate}
                    </h2>
                    <p className="text-sm text-slate-400 leading-relaxed">{T.stepDateDesc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={monthOffset === 0}
                    onClick={() => { setMonthOffset((m) => m - 1); setSelectedDay(null); }}
                    className="size-9 rounded-xl border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:border-white/20"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>

                  <span className="min-w-36 text-center text-sm font-semibold text-white">
                    {base.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', { month: 'long', year: 'numeric' })}
                  </span>

                  <Button
                    variant="outline"
                    size="icon"
                    disabled={monthOffset === 2}
                    onClick={() => { setMonthOffset((m) => m + 1); setSelectedDay(null); }}
                    className="size-9 rounded-xl border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:border-white/20"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-xs font-semibold text-slate-400 mb-2">
                {[T.sun, T.mon, T.tue, T.wed, T.thu, T.fri, T.sat].map((d, i) => (
                  <div key={i} className="py-1 uppercase tracking-wider">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {Array.from({ length: firstWeekday }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-10 sm:h-11" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const isPast = day < todayDay;
                  const selected = selectedDay === day;
                  return (
                    <button
                      key={day}
                      disabled={isPast}
                      onClick={() => setSelectedDay(day)}
                      className={cn(
                        'flex h-10 sm:h-11 w-full items-center justify-center rounded-xl text-sm font-medium transition-all',
                        isPast
                          ? 'border border-white/[0.03] bg-white/[0.02] text-slate-600 cursor-not-allowed'
                          : selected
                          ? 'border border-cyan-400 bg-cyan-500 text-white font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)] scale-105 z-10'
                          : 'border border-white/10 bg-white/5 text-slate-200 hover:border-cyan-400/40 hover:bg-white/10 hover:text-white cursor-pointer'
                      )}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Step 3: Time Slot */}
            <Card className="border border-white/10 bg-[#090f1e]/80 backdrop-blur-xl p-6 sm:p-8 text-slate-100 shadow-2xl rounded-3xl">
              <div className="flex items-center gap-3 mb-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs font-bold text-cyan-300">
                  03
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {T.stepTime}
                </h2>
              </div>
              <p className="mb-5 text-sm text-slate-400 leading-relaxed">
                {T.stepTimeDesc}
              </p>

              {!selectedDay ? (
                <div className="rounded-2xl border border-white/5 bg-white/5 py-8 text-center text-sm text-slate-400">
                  {T.selectDateFirst}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {timeSlots.map((slot) => {
                    const past = isSlotPast(slot);
                    const selected = selectedSlot === slot && !past;
                    return (
                      <button
                        key={slot}
                        disabled={past}
                        onClick={() => setSelectedSlot(slot)}
                        className={cn(
                          'rounded-xl border py-3 text-sm font-medium transition-all text-center',
                          past
                            ? 'border-white/[0.03] bg-white/[0.02] text-slate-600 line-through cursor-not-allowed'
                            : selected
                            ? 'border-cyan-400 bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.35)] font-semibold scale-[1.02] cursor-pointer'
                            : 'border-white/10 bg-white/5 text-slate-300 hover:border-cyan-400/40 hover:bg-white/10 cursor-pointer'
                        )}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Navigation bottom buttons */}
            <div className="flex items-center justify-between pt-2">
              <Link
                to={`/mentors/${mentor.id}`}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-all"
              >
                <ChevronLeft className="size-4" />
                {T.backToProfile}
              </Link>
              <Button
                onClick={cont}
                disabled={!selectedDay || !selectedSlot || slotUnavailable}
                className="py-2.5 px-6 text-sm font-semibold rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 disabled:opacity-40 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                {T.continueToOrder}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-slate-200">{value}</span>
    </div>
  );
}
