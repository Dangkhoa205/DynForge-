import { useState } from 'react';
import { Bell, Lock, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export function TeacherSettings() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const vi = lang === 'vi';
  const navigate = useNavigate();

  const notifToggles = [
    { key: 'booking', label: vi ? 'Yêu cầu đặt lịch mới' : 'New student bookings', description: vi ? 'Nhận thông báo khi học viên yêu cầu một buổi học.' : 'Get notified when a student requests a session.' },
    { key: 'reminder', label: vi ? 'Nhắc lịch buổi học' : 'Session reminders', description: vi ? 'Nhắc trước mỗi buổi học 24 giờ và 1 giờ.' : '24h and 1h reminder before each session.' },
    { key: 'payment', label: vi ? 'Giải ngân thanh toán' : 'Payment releases', description: vi ? 'Khi tiền ký quỹ được giải ngân về ví của bạn.' : 'When escrow funds are released to your wallet.' },
    { key: 'dispute', label: vi ? 'Cập nhật tranh chấp' : 'Dispute updates', description: vi ? 'Cập nhật tiến độ các tranh chấp liên quan đến buổi học của bạn.' : 'Progress updates on disputes involving your sessions.' },
    { key: 'review', label: vi ? 'Thông báo đánh giá' : 'Review alerts', description: vi ? 'Khi học viên để lại đánh giá cho bạn.' : 'When a student leaves you a review.' },
    { key: 'news', label: vi ? 'Tin tức nền tảng' : 'Platform news', description: vi ? 'Cập nhật tính năng và thông báo từ DynForge.' : 'Feature updates and DynForge announcements.' },
  ];

  const [notifs, setNotifs] = useState<Record<string, boolean>>(
    Object.fromEntries(notifToggles.map((n, i) => [n.key, i < 4]))
  );
  const toggle = (key: string) => setNotifs((p) => ({ ...p, [key]: !p[key] }));

  return (
    <div className="mx-auto max-w-[760px]">
      <div className="mb-6">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{vi ? 'Cài đặt' : 'Settings'}</h1>
        <p className="mt-1 text-muted-foreground">{vi ? 'Quản lý tài khoản và tùy chọn thông báo của bạn.' : 'Manage your account and notification preferences.'}</p>
      </div>

      <div className="space-y-6">
        <Card className="border-border p-6">
          <h2 className="mb-4 flex items-center gap-2" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
            <Lock className="size-5 text-muted-foreground" /> {vi ? 'Tài khoản' : 'Account'}
          </h2>
          <div className="space-y-3">
            {[
              { label: vi ? 'Địa chỉ email' : 'Email address', value: user?.email ?? '—', action: vi ? 'Quản lý' : 'Manage', onClick: () => navigate('/mentor/profile') },
              { label: vi ? 'Ngôn ngữ tài khoản' : 'Account language', value: lang === 'vi' ? 'Tiếng Việt' : 'English', action: vi ? 'Đổi' : 'Change' },
              { label: vi ? 'Múi giờ' : 'Time zone', value: 'GMT+7 (Ho Chi Minh City)', action: vi ? 'Đổi' : 'Change' },
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
            <Bell className="size-5 text-muted-foreground" /> {vi ? 'Tùy chọn thông báo' : 'Notification preferences'}
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
            <Trash2 className="size-5" /> {vi ? 'Vùng nguy hiểm' : 'Danger zone'}
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {vi ? 'Xoá tài khoản sẽ gỡ hồ sơ mentor của bạn vĩnh viễn. Hãy rút hết thu nhập và hoàn tất các buổi học đang diễn ra trước khi xoá.' : 'Deleting your account permanently removes your mentor profile. Withdraw your earnings and finish open sessions first.'}
          </p>
          <Button variant="destructive" onClick={() => navigate('/delete-account')}>
            {vi ? 'Xoá tài khoản mentor' : 'Delete mentor account'}
          </Button>
        </Card>
      </div>
    </div>
  );
}
