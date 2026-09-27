import { useState } from 'react';
import { Bell, Lock, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const notifToggles = [
  { label: 'New student bookings', description: 'Get notified when a student requests a session.', key: 'booking' },
  { label: 'Session reminders', description: '24h and 1h reminder before each session.', key: 'reminder' },
  { label: 'Payment releases', description: 'When escrow funds are released to your wallet.', key: 'payment' },
  { label: 'Dispute updates', description: 'Progress updates on disputes involving your sessions.', key: 'dispute' },
  { label: 'Review alerts', description: 'When a student leaves you a review.', key: 'review' },
  { label: 'Platform news', description: 'Feature updates and DynForge announcements.', key: 'news' },
];

export function TeacherSettings() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState<Record<string, boolean>>(
    Object.fromEntries(notifToggles.map((n, i) => [n.key, i < 4]))
  );
  const toggle = (key: string) => setNotifs((p) => ({ ...p, [key]: !p[key] }));

  return (
    <div className="mx-auto max-w-[760px]">
      <div className="mb-6">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Settings</h1>
        <p className="mt-1 text-muted-foreground">Manage your account and notification preferences.</p>
      </div>

      <div className="space-y-6">
        <Card className="border-border p-6">
          <h2 className="mb-4 flex items-center gap-2" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
            <Lock className="size-5 text-muted-foreground" /> Account
          </h2>
          <div className="space-y-3">
            {[
              { label: 'Email address', value: user?.email ?? '—', action: 'Manage', onClick: () => navigate('/mentor/profile') },
              { label: 'Account language', value: lang === 'vi' ? 'Tiếng Việt' : 'English', action: 'Change' },
              { label: 'Time zone', value: 'GMT+7 (Ho Chi Minh City)', action: 'Change' },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between rounded-xl border border-border p-3">
                <div>
                  <p className="text-sm text-muted-foreground">{r.label}</p>
                  <p style={{ fontWeight: 500 }}>{r.value}</p>
                </div>
                <Button variant="ghost" size="sm" className="text-primary" onClick={r.onClick}>{r.action}</Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-border p-6">
          <h2 className="mb-4 flex items-center gap-2" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
            <Bell className="size-5 text-muted-foreground" /> Notification preferences
          </h2>
          <div className="space-y-4">
            {notifToggles.map((n) => (
              <div key={n.key} className="flex items-center justify-between">
                <div>
                  <p style={{ fontWeight: 500 }}>{n.label}</p>
                  <p className="text-sm text-muted-foreground">{n.description}</p>
                </div>
                <Switch checked={notifs[n.key]} onCheckedChange={() => toggle(n.key)} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-danger/20 border-border p-6">
          <h2 className="mb-2 flex items-center gap-2 text-danger" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
            <Trash2 className="size-5" /> Danger zone
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {lang === 'vi'
              ? 'Xoá tài khoản sẽ gỡ hồ sơ mentor của bạn vĩnh viễn. Hãy rút hết thu nhập và hoàn tất các buổi học đang diễn ra trước khi xoá.'
              : 'Deleting your account permanently removes your mentor profile. Withdraw your earnings and finish open sessions first.'}
          </p>
          <Button variant="destructive" onClick={() => navigate('/delete-account')}>
            {lang === 'vi' ? 'Xoá tài khoản mentor' : 'Delete mentor account'}
          </Button>
        </Card>
      </div>
    </div>
  );
}
