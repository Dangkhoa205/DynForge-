import { useEffect, useState } from 'react';
import { Loader2, Users, GraduationCap, UserCheck, MapPin } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { KpiCard } from '../../components/cards';
import { toast } from 'sonner';
import { getDemographics, type Demographics, type InsightBucket } from '../../services/adminService';
import { useLanguage } from '../../context/LanguageContext';

type RoleFilter = 'ALL' | 'MENTEE' | 'MENTOR';

/** Horizontal bar list: label, bar proportional to the largest value, count and share. */
function BarList({ title, icon: Icon, data, total, hint }: {
  title: string;
  icon: React.ElementType;
  data: InsightBucket[];
  total: number;
  hint?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <Card className="border-border p-6">
      <h2 className="mb-1 flex items-center gap-2" style={{ fontSize: '1.05rem', fontWeight: 600 }}>
        <Icon className="size-4 text-primary" /> {title}
      </h2>
      {hint && <p className="mb-4 text-xs text-muted-foreground">{hint}</p>}
      {data.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">—</p>
      ) : (
        <ul className="space-y-2.5">
          {data.map((d) => {
            const unknown = d.label === 'Chưa cập nhật';
            return (
              <li key={d.label} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm">
                <span className={`truncate ${unknown ? 'text-muted-foreground italic' : ''}`} title={d.label}>{d.label}</span>
                <span className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <span
                    className={`block h-full rounded-full ${unknown ? 'bg-muted-foreground/40' : 'bg-primary'}`}
                    style={{ width: `${(d.count / max) * 100}%` }}
                  />
                </span>
                <span className="tabular-nums text-muted-foreground whitespace-nowrap">
                  <strong className="text-foreground">{d.count}</strong>
                  {total > 0 && ` · ${Math.round((d.count / total) * 100)}%`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export function AdminUserInsights() {
  const { lang } = useLanguage();
  const vi = lang === 'vi';
  const [role, setRole] = useState<RoleFilter>('ALL');
  const [data, setData] = useState<Demographics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getDemographics(role === 'ALL' ? undefined : role)
      .then(setData)
      .catch(() => toast.error(vi ? 'Không tải được thống kê người dùng.' : 'Failed to load user statistics.'))
      .finally(() => setLoading(false));
  }, [role]);

  const tabs: { key: RoleFilter; label: string }[] = [
    { key: 'ALL', label: vi ? 'Tất cả' : 'Everyone' },
    { key: 'MENTEE', label: vi ? 'Học viên' : 'Mentees' },
    { key: 'MENTOR', label: 'Mentor' },
  ];

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{vi ? 'Chân dung người dùng' : 'User demographics'}</h1>
          <p className="mt-1 text-muted-foreground">
            {vi ? 'Độ tuổi, ngành học, trường và vị trí địa lý của người dùng DynForge.' : 'Age, major, university and location of DynForge users.'}
          </p>
        </div>
        <div className="flex gap-1 rounded-xl border border-border p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setRole(t.key)}
              className={`rounded-lg px-3 py-1.5 text-sm ${role === t.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading || !data ? (
        <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" /> {vi ? 'Đang tải thống kê…' : 'Loading statistics…'}
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <KpiCard label={vi ? 'Tổng người dùng' : 'Total users'} value={String(data.totalUsers)} icon={Users} />
            <KpiCard label={vi ? 'Học viên' : 'Mentees'} value={String(data.mentees)} icon={GraduationCap} />
            <KpiCard label="Mentor" value={String(data.mentors)} icon={UserCheck} tone="success" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <BarList
              title={vi ? 'Độ tuổi' : 'Age groups'}
              icon={Users}
              data={data.ageGroups}
              total={data.totalUsers}
              hint={vi
                ? `${data.profilesWithAge}/${data.totalUsers} người đã khai báo năm sinh trong hồ sơ.`
                : `${data.profilesWithAge}/${data.totalUsers} users have set their birth year.`}
            />
            <BarList title={vi ? 'Ngành học' : 'Majors'} icon={GraduationCap} data={data.majors} total={data.totalUsers} />
            <BarList title={vi ? 'Trường' : 'Universities'} icon={GraduationCap} data={data.universities} total={data.totalUsers} />
            <BarList
              title={vi ? 'Vị trí địa lý (tỉnh/thành)' : 'Location (province/city)'}
              icon={MapPin}
              data={data.provinces}
              total={data.totalUsers}
              hint={vi
                ? `${data.profilesWithProvince}/${data.totalUsers} người đã khai báo tỉnh/thành trong hồ sơ.`
                : `${data.profilesWithProvince}/${data.totalUsers} users have set their province.`}
            />
          </div>
        </>
      )}
    </div>
  );
}
