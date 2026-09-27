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

const notifToggles: Toggle[] = [
  { label: 'Session reminders', description: 'Get notified 24h and 1h before a session.', key: 'session' },
  { label: 'Booking confirmations', description: 'Confirm when a mentor accepts your booking.', key: 'booking' },
  { label: 'Escrow updates', description: 'Notifications when your escrow status changes.', key: 'escrow' },
  { label: 'Dispute updates', description: 'Progress updates on your dispute cases.', key: 'dispute' },
  { label: 'Mentor messages', description: 'Receive messages from mentors.', key: 'messages' },
  { label: 'DynForge news', description: 'Platform updates, new features, and events.', key: 'news' },
];

export function DashboardSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lang } = useLanguage();
  const [notifs, setNotifs] = useState<Record<string, boolean>>({
    session: true, booking: true, escrow: true, dispute: true, messages: true, news: false,
  });

  const toggle = (key: string) => setNotifs((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="mx-auto max-w-[760px]">
      <div className="mb-6">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Settings</h1>
        <p className="mt-1 text-muted-foreground">Manage your account, notifications, and privacy preferences.</p>
      </div>

      <div className="space-y-6">
        {/* Account */}
        <Card className="border-border p-6">
          <h2 className="mb-4 flex items-center gap-2" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
            <Lock className="size-5 text-muted-foreground" /> Account settings
          </h2>
          <div className="space-y-3">
            <SettingRow label="Full name" value={user?.name ?? '—'} action="Edit" onClick={() => navigate('/dashboard/profile')} />
            <SettingRow label="Email address" value={user?.email ?? '—'} action="Manage" onClick={() => navigate('/dashboard/profile')} />
            <SettingRow label="Account language" value={lang === 'vi' ? 'Tiếng Việt' : 'English'} action="Change" />
          </div>
        </Card>

        {/* Notifications */}
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

        {/* Payment */}
        <Card className="border-border p-6">
          <h2 className="mb-4 flex items-center gap-2" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
            <CreditCard className="size-5 text-muted-foreground" /> Payment preferences
          </h2>
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block">Default payment method</Label>
              <Select defaultValue="wallet">
                <SelectTrigger className="bg-input-background sm:w-64"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="wallet">DynForge Wallet</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontWeight: 500 }}>Auto-confirm sessions</p>
                <p className="text-sm text-muted-foreground">Automatically confirm session completion after 24h.</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </Card>

        {/* Privacy */}
        <Card className="border-border p-6">
          <h2 className="mb-4 flex items-center gap-2" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
            <Lock className="size-5 text-muted-foreground" /> Privacy
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontWeight: 500 }}>Show my profile publicly</p>
                <p className="text-sm text-muted-foreground">Let mentors see your basic profile when you book.</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontWeight: 500 }}>Share session history with mentors</p>
                <p className="text-sm text-muted-foreground">Allow mentors to see what you've studied before.</p>
              </div>
              <Switch />
            </div>
          </div>
        </Card>

        {/* Danger zone */}
        <Card className="border-border border-danger/20 p-6">
          <h2 className="mb-2 flex items-center gap-2 text-danger" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
            <Trash2 className="size-5" /> Danger zone
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {lang === 'vi'
              ? 'Xoá tài khoản là vĩnh viễn. Hãy rút hết số dư ví và hoàn tất các buổi học đã thanh toán trước khi xoá.'
              : 'Deleting your account is permanent. Withdraw your wallet balance and finish any paid sessions first.'}
          </p>
          <Button variant="destructive" onClick={() => navigate('/delete-account')}>
            {lang === 'vi' ? 'Xoá tài khoản của tôi' : 'Delete my account'}
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
