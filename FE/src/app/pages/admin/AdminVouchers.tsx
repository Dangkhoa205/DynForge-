import { useState, useEffect } from 'react';
import { Plus, Tag, Copy, CheckCircle2, Trash2, Search } from 'lucide-react';
import { formatCurrency, mentors } from '../../data/mockData';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import { useLanguage } from '../../context/LanguageContext';
import { formatDate } from '../../lib/format';

const STATUS_LABELS_VI: Record<VoucherStatus, string> = {
  Active: 'Đang hoạt động', Expired: 'Hết hạn', Disabled: 'Đã tắt',
};
const TAB_LABELS_VI: Record<string, string> = {
  All: 'Tất cả', Active: 'Hoạt động', Expired: 'Hết hạn', Disabled: 'Đã tắt',
};

type VoucherType = 'percentage' | 'fixed';
type VoucherScope = 'platform' | 'mentor';
type VoucherStatus = 'Active' | 'Expired' | 'Disabled';

interface Voucher {
  id: string;
  code: string;
  type: VoucherType;
  value: number;
  minOrder: number;
  scope: VoucherScope;
  mentorName?: string;
  usageLimit: number;
  usedCount: number;
  expiry: string;
  status: VoucherStatus;
  createdBy: string;
}

const seedVouchers: Voucher[] = [
  { id: 'v1', code: 'DYNFORGE20', type: 'percentage', value: 20, minOrder: 100000, scope: 'platform', usageLimit: 500, usedCount: 143, expiry: '2026-07-31', status: 'Active', createdBy: 'Admin' },
  { id: 'v2', code: 'WELCOME50K', type: 'fixed', value: 50000, minOrder: 80000, scope: 'platform', usageLimit: 200, usedCount: 200, expiry: '2026-06-30', status: 'Expired', createdBy: 'Admin' },
  { id: 'v3', code: 'LINH15', type: 'percentage', value: 15, minOrder: 90000, scope: 'mentor', mentorName: 'Nguyễn Thị Linh', usageLimit: 50, usedCount: 12, expiry: '2026-08-15', status: 'Active', createdBy: 'Mentor' },
  { id: 'v4', code: 'GROUPDEAL', type: 'fixed', value: 30000, minOrder: 55000, scope: 'platform', usageLimit: 300, usedCount: 89, expiry: '2026-09-01', status: 'Active', createdBy: 'Admin' },
];

const statusColor: Record<VoucherStatus, string> = {
  Active: 'bg-success/10 text-success border-success/20',
  Expired: 'bg-muted text-muted-foreground',
  Disabled: 'bg-danger/10 text-danger border-danger/20',
};

function VoucherFormDialog({
  open,
  onClose,
  createdBy = 'Admin',
  mentorLock,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  createdBy?: string;
  mentorLock?: string;
  onCreate?: (v: Voucher) => void;
}) {
  const { lang } = useLanguage();
  const vi = lang === 'vi';
  const [type, setType] = useState<VoucherType>('percentage');
  const [scope, setScope] = useState<VoucherScope>(mentorLock ? 'mentor' : 'platform');
  const [autoCode, setAutoCode] = useState(true);
  const [code, setCode] = useState(() => `GRD${Math.random().toString(36).substring(2, 7).toUpperCase()}`);
  const [val, setVal] = useState('20');
  const [minOrder, setMinOrder] = useState('80000');
  const [usageLimit, setUsageLimit] = useState('100');
  const [mentorName, setMentorName] = useState(mentors[0]?.name ?? 'Mentor');
  const [expiry, setExpiry] = useState('2026-08-31');

  const generate = () => {
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    setCode(`GRD${rand}`);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const numVal = parseInt(val) || (type === 'percentage' ? 20 : 50000);
    const numMin = parseInt(minOrder) || 0;
    const numLimit = parseInt(usageLimit) || 100;
    const newV: Voucher = {
      id: `v-${Date.now()}`,
      code: code || `GRD${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      type,
      value: numVal,
      minOrder: numMin,
      scope,
      mentorName: scope === 'mentor' ? (mentorLock || mentorName) : undefined,
      usageLimit: numLimit,
      usedCount: 0,
      expiry: expiry || '2026-08-31',
      status: 'Active',
      createdBy,
    };
    onCreate?.(newV);
    toast.success(vi ? `Voucher ${newV.code} đã được kích hoạt!` : `Voucher ${newV.code} is now active!`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="size-5 text-primary" />
            {mentorLock ? (vi ? 'Tạo voucher mentor' : 'Create mentor voucher') : (vi ? 'Tạo voucher mới' : 'Create new voucher')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {/* Code */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <Label>{vi ? 'Mã voucher' : 'Voucher code'}</Label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <Switch checked={autoCode} onCheckedChange={(v) => { setAutoCode(v); if (v) generate(); }} />
                {vi ? 'Tự tạo mã' : 'Auto-generate'}
              </label>
            </div>
            <div className="flex gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                readOnly={autoCode}
                placeholder={vi ? 'vd: SUMMER30' : 'e.g. SUMMER30'}
                className="bg-input-background font-mono tracking-widest uppercase"
                required
              />
              {autoCode && (
                <Button type="button" variant="outline" size="icon" onClick={generate}>
                  <Tag className="size-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Type + Value */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">{vi ? 'Loại giảm giá' : 'Discount type'}</Label>
              <Select value={type} onValueChange={(v) => {
                const t = v as VoucherType;
                setType(t);
                setVal(t === 'percentage' ? '20' : '50000');
              }}>
                <SelectTrigger className="bg-input-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">{vi ? 'Phần trăm (%)' : 'Percentage (%)'}</SelectItem>
                  <SelectItem value="fixed">{vi ? 'Số tiền cố định (₫)' : 'Fixed amount (₫)'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">{vi ? 'Giá trị giảm' : 'Discount value'}</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={val}
                  onChange={(e) => setVal(e.target.value)}
                  placeholder={type === 'percentage' ? '20' : '50000'}
                  className="bg-input-background pr-10"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {type === 'percentage' ? '%' : '₫'}
                </span>
              </div>
            </div>
          </div>

          {/* Min order + Usage limit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">{vi ? 'Đơn tối thiểu (₫)' : 'Min. order (₫)'}</Label>
              <Input
                type="number"
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value)}
                placeholder="80000"
                className="bg-input-background"
              />
            </div>
            <div>
              <Label className="mb-1.5 block">{vi ? 'Giới hạn lượt dùng' : 'Usage limit'}</Label>
              <Input
                type="number"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                placeholder="100"
                className="bg-input-background"
                required
              />
            </div>
          </div>

          {/* Scope */}
          {!mentorLock && (
            <div>
              <Label className="mb-1.5 block">{vi ? 'Áp dụng cho' : 'Applies to'}</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as VoucherScope)}>
                <SelectTrigger className="bg-input-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="platform">{vi ? 'Mọi buổi học (toàn nền tảng)' : 'All sessions (platform-wide)'}</SelectItem>
                  <SelectItem value="mentor">{vi ? 'Chỉ một mentor cụ thể' : 'Specific mentor only'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {(scope === 'mentor' || mentorLock) && (
            <div>
              <Label className="mb-1.5 block">Mentor</Label>
              {mentorLock ? (
                <Input value={mentorLock} readOnly className="bg-input-background" />
              ) : (
                <Select value={mentorName} onValueChange={setMentorName}>
                  <SelectTrigger className="bg-input-background"><SelectValue placeholder={vi ? 'Chọn mentor' : 'Select mentor'} /></SelectTrigger>
                  <SelectContent>
                    {mentors.map((m) => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Expiry */}
          <div>
            <Label className="mb-1.5 block">{vi ? 'Ngày hết hạn' : 'Expiry date'}</Label>
            <Input
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="bg-input-background"
              required
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>{vi ? 'Huỷ' : 'Cancel'}</Button>
            <Button type="submit"><Plus className="size-4" /> {vi ? 'Tạo voucher' : 'Create voucher'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminVouchers() {
  const { lang } = useLanguage();
  const vi = lang === 'vi';
  const [vouchers, setVouchers] = useState<Voucher[]>(() => {
    try {
      const saved = localStorage.getItem('dynforge_admin_vouchers');
      return saved ? JSON.parse(saved) : seedVouchers;
    } catch {
      return seedVouchers;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('dynforge_admin_vouchers', JSON.stringify(vouchers));
    } catch {}
  }, [vouchers]);

  const [showCreate, setShowCreate] = useState(false);
  const [tabFilter, setTabFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedId(id);
    toast.success(vi ? `Đã sao chép "${code}"` : `Copied "${code}"`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const remove = (id: string) => {
    setVouchers((prev) => prev.filter((v) => v.id !== id));
    toast.success(vi ? 'Đã xoá voucher.' : 'Voucher removed.');
  };

  const filtered = vouchers.filter((v) => {
    const matchTab = tabFilter === 'All' || v.status === tabFilter;
    const matchQ = !query || v.code.toLowerCase().includes(query.toLowerCase());
    return matchTab && matchQ;
  });

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Voucher</h1>
          <p className="mt-1 text-muted-foreground">{vi ? 'Tạo và quản lý voucher giảm giá cho học viên.' : 'Create and manage discount vouchers for mentees.'}</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="size-4" /> {vi ? 'Tạo voucher' : 'Create voucher'}
        </Button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: vi ? 'Voucher đang hoạt động' : 'Active vouchers', value: vouchers.filter((v) => v.status === 'Active').length, color: 'text-success' },
          { label: vi ? 'Tổng lượt dùng' : 'Total uses', value: vouchers.reduce((s, v) => s + v.usedCount, 0), color: 'text-primary' },
          { label: vi ? 'Hết hạn' : 'Expired', value: vouchers.filter((v) => v.status === 'Expired').length, color: 'text-muted-foreground' },
        ].map((s) => (
          <Card key={s.label} className="border-border p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={`mt-1 ${s.color}`} style={{ fontSize: '2rem', fontWeight: 800 }}>{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="border-border p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={vi ? 'Tìm mã…' : 'Search code...'} className="bg-input-background pl-9" />
          </div>
          <Tabs value={tabFilter} onValueChange={setTabFilter}>
            <TabsList>
              {['All', 'Active', 'Expired', 'Disabled'].map((t) => <TabsTrigger key={t} value={t}>{vi ? TAB_LABELS_VI[t] : t}</TabsTrigger>)}
            </TabsList>
          </Tabs>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{vi ? 'Mã' : 'Code'}</TableHead>
                <TableHead>{vi ? 'Giảm giá' : 'Discount'}</TableHead>
                <TableHead>{vi ? 'Đơn tối thiểu' : 'Min. order'}</TableHead>
                <TableHead>{vi ? 'Phạm vi' : 'Scope'}</TableHead>
                <TableHead>{vi ? 'Lượt dùng' : 'Usage'}</TableHead>
                <TableHead>{vi ? 'Hết hạn' : 'Expiry'}</TableHead>
                <TableHead>{vi ? 'Người tạo' : 'Created by'}</TableHead>
                <TableHead>{vi ? 'Trạng thái' : 'Status'}</TableHead>
                <TableHead className="text-right">{vi ? 'Thao tác' : 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="rounded bg-accent px-2 py-0.5 text-sm" style={{ fontWeight: 700 }}>{v.code}</code>
                      <button onClick={() => copyCode(v.id, v.code)} className="text-muted-foreground hover:text-primary">
                        {copiedId === v.id ? <CheckCircle2 className="size-4 text-success" /> : <Copy className="size-4" />}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell style={{ fontWeight: 600 }}>
                    {v.type === 'percentage' ? `${v.value}%` : formatCurrency(v.value)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatCurrency(v.minOrder)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-accent text-accent-foreground">
                      {v.scope === 'mentor' ? `Mentor: ${v.mentorName}` : (vi ? 'Toàn nền tảng' : 'Platform-wide')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      <span style={{ fontWeight: 600 }}>{v.usedCount}</span>
                      <span className="text-muted-foreground">/ {v.usageLimit}</span>
                      <div className="h-1.5 w-16 rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.min(100, (v.usedCount / v.usageLimit) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDate(v.expiry, lang, { day: '2-digit', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{v.createdBy === 'Admin' ? 'Admin' : (vi ? 'Mentor' : v.createdBy)}</TableCell>
                  <TableCell>
                    <Badge className={`border ${statusColor[v.status]}`}>{vi ? STATUS_LABELS_VI[v.status] : v.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-danger hover:bg-danger/10" onClick={() => remove(v.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <VoucherFormDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={(v) => setVouchers((prev) => [v, ...prev])}
      />
    </div>
  );
}
