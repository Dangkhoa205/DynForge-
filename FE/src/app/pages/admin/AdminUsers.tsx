import { useMemo, useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import { StatusBadge } from '../../components/common';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { listAdminUsers, updateUserStatus } from '../../services/adminService';
import type { UserProfile } from '../../services/userService';

const roleColor: Record<string, string> = {
  MENTEE: 'bg-primary/10 text-primary border-primary/20',
  MENTOR: 'bg-success/10 text-success border-success/20',
  ADMIN: 'bg-warning/10 text-warning border-warning/20',
};

function primaryRole(roles: string[]): string {
  if (roles.includes('ADMIN')) return 'ADMIN';
  if (roles.includes('MENTOR')) return 'MENTOR';
  return 'MENTEE';
}

export function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    listAdminUsers()
      .then(setUsers)
      .catch(() => toast.error('Failed to load users.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = query.toLowerCase();
      const matchQ = !q || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchR = roleFilter === 'All' || primaryRole(u.roles) === roleFilter;
      return matchQ && matchR;
    });
  }, [users, query, roleFilter]);

  const toggleStatus = async (u: UserProfile) => {
    const next = u.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    setActingId(u.id);
    try {
      const updated = await updateUserStatus(u.id, next);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
      toast.success(`${u.fullName} ${next === 'SUSPENDED' ? 'suspended' : 'reactivated'}.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Action failed.');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="mb-6">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>User Management</h1>
        <p className="mt-1 text-muted-foreground">Search, view, and manage all platform users.</p>
      </div>

      <Card className="border-border p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email"
              className="bg-input-background pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All roles</SelectItem>
              <SelectItem value="MENTEE">Student</SelectItem>
              <SelectItem value="MENTOR">Mentor</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="size-5 animate-spin" /> Loading users…
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">{filtered.length} users</p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Major</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => {
                    const role = primaryRole(u.roles);
                    return (
                      <TableRow key={u.id}>
                        <TableCell style={{ fontWeight: 500 }}>{u.fullName}</TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell><Badge className={`border ${roleColor[role]}`}>{role}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{u.major ?? '—'}</TableCell>
                        <TableCell><StatusBadge status={u.status === 'ACTIVE' ? 'Active' : u.status === 'DELETED' ? 'Deleted' : 'Suspended'} /></TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {new Date(u.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className={u.status === 'SUSPENDED' ? 'text-success border-success/30' : 'text-danger border-danger/30'}
                            onClick={() => toggleStatus(u)}
                            disabled={actingId === u.id || role === 'ADMIN' || u.status === 'DELETED'}
                          >
                            {actingId === u.id
                              ? <Loader2 className="size-3.5 animate-spin" />
                              : u.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
