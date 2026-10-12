import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Bell, CreditCard, Lock, Trash2 } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface Toggle { label: string; description: string; key: string }

export function DashboardSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lang } = useLanguage();
  const vi = lang === 'vi';
  const [notifs, setNotifs] = useState<Record<string, boolean>>({
    session: true, booking: true, escrow: true, dispute: true, messages: true, news: false,
  });

  const notifToggles: Toggle[] = [
    { key: 'session', label: vi ? 'Nhắc lịch học' : 'Session reminders', description: vi ? 'Nhận thông báo trước buổi học 24 giờ và 1 giờ.' : 'Get notified 24h and 1h before a session.' },
    { key: 'booking', label: vi ? 'Xác nhận đặt lịch' : 'Booking confirmations', description: vi ? 'Báo khi mentor chấp nhận yêu cầu đặt lịch của bạn.' : 'Confirm when a mentor accepts your booking.' },
    { key: 'escrow', label: vi ? 'Cập nhật ký quỹ (Escrow)' : 'Escrow updates', description: vi ? 'Thông báo khi trạng thái ký quỹ của bạn thay đổi.' : 'Notifications when your escrow status changes.' },
    { key: 'dispute', label: vi ? 'Cập nhật tranh chấp' : 'Dispute updates', description: vi ? 'Cập nhật tiến độ các vụ tranh chấp của bạn.' : 'Progress updates on your dispute cases.' },
    { key: 'messages', label: vi ? 'Tin nhắn từ mentor' : 'Mentor messages', description: vi ? 'Nhận tin nhắn từ các mentor.' : 'Receive messages from mentors.' },
    { key: 'news', label: vi ? 'Tin tức DynForge' : 'DynForge news', description: vi ? 'Cập nhật nền tảng, tính năng mới và sự kiện.' : 'Platform updates, new features, and events.' },
  ];

  const toggle = (key: string) => setNotifs((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="mx-auto max-w-[760px]">
      <div className="mb-6">
        <h1 className="font-heading" style={{ fontSize: '1.75rem', fontWeight: 700 }}>{vi ? 'Cài đặt' : 'Settings'}</h1>
        <p className="mt-1 text-muted-foreground">{vi ? 'Quản lý tài khoản, thông báo và quyền riêng tư của bạn.' : 'Manage your account, notifications, and privacy preferences.'}</p>
      </div>

      <div className="space-y-6">
        {/* Account */}
        <Card className="border-border p-6">
          <h2 className="mb-4 flex items-center gap-2" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
            <Lock className="size-5 text-muted-foreground" /> {vi ? 'Cài đặt tài khoản' : 'Account settings'}
          </h2>
          <div className="space-y-3">
            <SettingRow label={vi ? 'Họ và tên' : 'Full name'} value={user?.name ?? '—'} action={vi ? 'Sửa' : 'Edit'} onClick={() => navigate('/dashboard/profile')} />
            <SettingRow label={vi ? 'Địa chỉ email' : 'Email address'} value={user?.email ?? '—'} action={vi ? 'Quản lý' : 'Manage'} onClick={() => navigate('/dashboard/profile')} />
            <SettingRow label={vi ? 'Ngôn ngữ tài khoản' : 'Account language'} value={vi ? 'Tiếng Việt' : 'English'} action={vi ? 'Đổi' : 'Change'} />
          </div>
        </Card>

        {/* Notifications */}
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

        {/* Payment */}
        <Card className="border-border p-6">
          <h2 className="mb-4 flex items-center gap-2" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
            <CreditCard className="size-5 text-muted-foreground" /> {vi ? 'Tùy chọn thanh toán' : 'Payment preferences'}
          </h2>
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block">{vi ? 'Phương thức thanh toán mặc định' : 'Default payment method'}</Label>
              <Select defaultValue="wallet">
                <SelectTrigger className="bg-input-background sm:w-64"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="wallet">{vi ? 'Ví DynForge' : 'DynForge Wallet'}</SelectItem>
                  <SelectItem value="bank">{vi ? 'Chuyển khoản ngân hàng' : 'Bank Transfer'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontWeight: 500 }}>{vi ? 'Tự động xác nhận buổi học' : 'Auto-confirm sessions'}</p>
                <p className="text-sm text-muted-foreground">{vi ? 'Tự động xác nhận hoàn tất buổi học sau 24 giờ.' : 'Automatically confirm session completion after 24h.'}</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </Card>

        {/* Privacy */}
        <Card className="border-border p-6">
          <h2 className="mb-4 flex items-center gap-2" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
            <Lock className="size-5 text-muted-foreground" /> {vi ? 'Quyền riêng tư' : 'Privacy'}
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontWeight: 500 }}>{vi ? 'Hiển thị hồ sơ công khai' : 'Show my profile publicly'}</p>
                <p className="text-sm text-muted-foreground">{vi ? 'Cho phép mentor xem hồ sơ cơ bản của bạn khi bạn đặt lịch.' : 'Let mentors see your basic profile when you book.'}</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontWeight: 500 }}>{vi ? 'Chia sẻ lịch sử học với mentor' : 'Share session history with mentors'}</p>
                <p className="text-sm text-muted-foreground">{vi ? 'Cho phép mentor xem những gì bạn đã học trước đây.' : "Allow mentors to see what you've studied before."}</p>
              </div>
              <Switch />
            </div>
          </div>
        </Card>

        {/* Danger zone */}
        <Card className="border-border border-danger/20 p-6">
          <h2 className="mb-2 flex items-center gap-2 text-danger" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
            <Trash2 className="size-5" /> {vi ? 'Vùng nguy hiểm' : 'Danger zone'}
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {vi
              ? 'Xoá tài khoản là vĩnh viễn. Hãy rút hết số dư ví và hoàn tất các buổi học đã thanh toán trước khi xoá.'
              : 'Deleting your account is permanent. Withdraw your wallet balance and finish any paid sessions first.'}
          </p>
          <Button
            variant="destructive"
            onClick={() => navigate('/delete-account')}
          >
            {vi ? 'Xoá tài khoản của tôi' : 'Delete my account'}
          </Button>
        </Card>
      </div>
    </div>
  );
}

function SettingRow({ label, value, action, onClick }: { label: string; value: string; action: string; onClick?: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border p-3">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p style={{ fontWeight: 500 }}>{value}</p>
      </div>
      <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10 cursor-pointer" onClick={onClick}>{action}</Button>
    </div>
  );
}
