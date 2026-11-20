import { useState, useEffect } from 'react';
import { VN_PROVINCES } from '../../lib/provinces';
import { Loader2 } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../components/ui/dialog';
import { useAuth } from '../../context/AuthContext';
import { useUniversity } from '../../context/UniversityContext';
import { useLanguage } from '../../context/LanguageContext';
import { toast } from 'sonner';
import {
  getMe, updateProfile, changePassword, type UserProfile,
} from '../../services/userService';

function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const { lang } = useLanguage();
  const vi = lang === 'vi';
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) { toast.error(vi ? 'Mật khẩu mới phải có ít nhất 8 ký tự.' : 'New password must be at least 8 characters.'); return; }
    if (next !== confirm) { toast.error(vi ? 'Mật khẩu nhập lại không khớp.' : 'Passwords do not match.'); return; }
    setSaving(true);
    try {
      await changePassword(current, next);
      toast.success(vi ? 'Đã đổi mật khẩu. Bạn có thể cần đăng nhập lại trên các thiết bị khác.' : 'Password changed. You may need to sign in again on other devices.');
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? (vi ? 'Không đổi được mật khẩu.' : 'Could not change password.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader><DialogTitle>{vi ? 'Đổi mật khẩu' : 'Change password'}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label className="mb-1.5 block">{vi ? 'Mật khẩu hiện tại' : 'Current password'}</Label>
            <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className="bg-input-background" autoFocus />
          </div>
          <div>
            <Label className="mb-1.5 block">{vi ? 'Mật khẩu mới' : 'New password'}</Label>
            <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} className="bg-input-background" />
          </div>
          <div>
            <Label className="mb-1.5 block">{vi ? 'Xác nhận mật khẩu mới' : 'Confirm new password'}</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="bg-input-background" />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>{vi ? 'Huỷ' : 'Cancel'}</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : (vi ? 'Cập nhật mật khẩu' : 'Update password')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DashboardProfile() {
  const { refreshUser } = useAuth();
  const { lang } = useLanguage();
  const vi = lang === 'vi';
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Editable fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [studentId, setStudentId] = useState('');
  const [major, setMajor] = useState('');
  const [year, setYear] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [province, setProvince] = useState('');
  const [universityCode, setUniversityCode] = useState('');
  const { universities } = useUniversity();
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    getMe()
      .then((me) => {
        setProfile(me);
        setFullName(me.fullName ?? '');
        setPhone(me.phone ?? '');
        setStudentId(me.studentId ?? '');
        setMajor(me.major ?? '');
        setYear(me.year ?? '');
        setBirthYear(me.birthYear ? String(me.birthYear) : '');
        setProvince(me.province ?? '');
        setUniversityCode(me.universityCode ?? '');
        setAvatarUrl(me.avatarUrl ?? '');
      })
      .catch(() => toast.error(vi ? 'Không tải được hồ sơ.' : 'Failed to load profile.'))
      .finally(() => setLoading(false));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { toast.error(vi ? 'Vui lòng nhập họ và tên.' : 'Full name is required.'); return; }
    const by = birthYear.trim() ? Number(birthYear) : undefined;
    if (by !== undefined && (!Number.isInteger(by) || by < 1940 || by > 2015)) {
      toast.error(vi ? 'Năm sinh không hợp lệ (1940–2015).' : 'Invalid birth year (1940–2015).');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        studentId: studentId.trim() || undefined,
        major: major.trim() || undefined,
        year: year.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
        birthYear: by,
        province: province || undefined,
        universityCode: universityCode || undefined,
      });
      await refreshUser();
      toast.success(vi ? 'Cập nhật hồ sơ thành công.' : 'Profile updated successfully.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? (vi ? 'Không lưu được hồ sơ.' : 'Could not save profile.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-muted-foreground gap-2">
        <Loader2 className="size-5 animate-spin" /> {vi ? 'Đang tải hồ sơ…' : 'Loading profile…'}
      </div>
    );
  }

  const initials = fullName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="mx-auto max-w-[900px]">
      <div className="mb-6">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{vi ? 'Hồ sơ của tôi' : 'My Profile'}</h1>
        <p className="mt-1 text-muted-foreground">{vi ? 'Quản lý thông tin cá nhân và bảo mật tài khoản của bạn.' : 'Manage your personal information and account security.'}</p>
      </div>

      <form onSubmit={save} className="space-y-6">
        {/* Avatar */}
        <Card className="border-border p-6">
          <h2 className="mb-4" style={{ fontSize: '1.125rem', fontWeight: 600 }}>{vi ? 'Ảnh đại diện' : 'Profile photo'}</h2>
          <div className="flex items-center gap-5">
            <div className="flex size-20 items-center justify-center overflow-hidden rounded-2xl bg-accent">
              {avatarUrl
                ? <img src={avatarUrl} alt={fullName} className="size-full object-cover" />
                : <span className="text-2xl" style={{ fontWeight: 600 }}>{initials || '?'}</span>}
            </div>
            <div className="flex-1">
              <Label className="mb-1.5 block">{vi ? 'Đường dẫn ảnh đại diện' : 'Avatar URL'}</Label>
              <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" className="bg-input-background" />
            </div>
          </div>
        </Card>

        {/* Personal info */}
        <Card className="border-border p-6">
          <h2 className="mb-4" style={{ fontSize: '1.125rem', fontWeight: 600 }}>{vi ? 'Thông tin cá nhân' : 'Personal information'}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block">{vi ? 'Họ và tên' : 'Full name'}</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-input-background" />
            </div>
            <div>
              <Label className="mb-1.5 block">Email</Label>
              <Input value={profile?.email ?? ''} disabled className="bg-muted/50" />
            </div>
            <div>
              <Label className="mb-1.5 block">{vi ? 'Số điện thoại' : 'Phone number'}</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" className="bg-input-background" />
            </div>
            <div>
              <Label className="mb-1.5 block">{vi ? 'Mã số sinh viên' : 'Student ID'}</Label>
              <Input value={studentId} onChange={(e) => setStudentId(e.target.value)} className="bg-input-background" />
            </div>
            <div>
              <Label className="mb-1.5 block">{vi ? 'Trường' : 'University'}</Label>
              <select
                value={universityCode}
                onChange={(e) => setUniversityCode(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-input-background px-3 text-sm"
              >
                <option value="">{vi ? '— Chọn trường —' : '— Select —'}</option>
                {[...universities]
                  .sort((a, b) => (a.code === 'OTHER' ? 1 : b.code === 'OTHER' ? -1 : (a.shortName || a.name).localeCompare(b.shortName || b.name, 'vi')))
                  .map((u) => (
                    <option key={u.code} value={u.code}>
                      {u.code === 'OTHER' ? u.name : `${u.shortName || u.code} — ${u.name}`}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <Label className="mb-1.5 block">{vi ? 'Ngành học' : 'Major'}</Label>
              <Input value={major} onChange={(e) => setMajor(e.target.value)} className="bg-input-background" />
            </div>
            <div>
              <Label className="mb-1.5 block">{vi ? 'Khoá / Năm' : 'Year'}</Label>
              <Input value={year} onChange={(e) => setYear(e.target.value)} placeholder={vi ? 'vd: 2022' : 'e.g. 2022'} className="bg-input-background" />
            </div>
            <div>
              <Label className="mb-1.5 block">{vi ? 'Năm sinh' : 'Birth year'}</Label>
              <Input type="number" min={1940} max={2015} value={birthYear} onChange={(e) => setBirthYear(e.target.value)} placeholder={vi ? 'vd: 2004' : 'e.g. 2004'} className="bg-input-background" />
            </div>
            <div>
              <Label className="mb-1.5 block">{vi ? 'Tỉnh / Thành phố' : 'Province / City'}</Label>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-input-background px-3 text-sm"
              >
                <option value="">{vi ? '— Chọn tỉnh/thành —' : '— Select —'}</option>
                {VN_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </Card>

        {/* Security */}
        <Card className="border-border p-6">
          <h2 className="mb-4" style={{ fontSize: '1.125rem', fontWeight: 600 }}>{vi ? 'Bảo mật' : 'Security'}</h2>
          <div className="flex items-center justify-between rounded-xl border border-border p-4">
            <div>
              <p style={{ fontWeight: 500 }}>{vi ? 'Mật khẩu' : 'Password'}</p>
              <p className="text-sm text-muted-foreground">{vi ? 'Đổi mật khẩu tài khoản của bạn.' : 'Change your account password.'}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowPassword(true)}>{vi ? 'Đổi' : 'Change'}</Button>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : (vi ? 'Lưu thay đổi' : 'Save Changes')}
          </Button>
        </div>
      </form>

      {showPassword && <ChangePasswordDialog onClose={() => setShowPassword(false)} />}
    </div>
  );
}
