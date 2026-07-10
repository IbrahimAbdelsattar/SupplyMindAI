import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  KeyRound,
  Loader2,
  Shield,
  AlertTriangle,
  Copy,
  Check,
  Users,
  UserCheck,
  ShieldCheck,
  UserX
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useAuthContext } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { UserFormDialog } from '@/components/admin/UserFormDialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  department?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
}

const ROLE_COLORS: Record<string, 'default' | 'secondary' | 'outline'> = {
  admin: 'default',
  manager: 'secondary',
  analyst: 'outline',
  viewer: 'outline',
};

export default function AdminUsers() {
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation('common');
  const { user: currentUser } = useAuthContext();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<UserProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [passwordResetResult, setPasswordResetResult] = useState<{ user: UserProfile; temp_password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchApi('/auth/admin/users') as { users: UserProfile[]; total: number };
      setUsers(res.users);
    } catch (err) {
      toast({
        title: t('toast.error'),
        description: err instanceof Error ? err.message : t('toast.errorDesc'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreate = async (data: { name: string; email: string; role: string; department: string; password?: string }) => {
    const res = await fetchApi('/auth/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }) as UserProfile & { temp_password: string };

    toast({
      title: t('toast.created'),
      description: t('toast.createdDesc'),
    });

    loadUsers();
    return { temp_password: res.temp_password };
  };

  const handleEdit = async (data: { name: string; email: string; role: string; department: string }) => {
    if (!editUser) return {};
    await fetchApi(`/auth/admin/users/${editUser.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: data.name,
        role: data.role,
        department: data.department || null,
      }),
    });

    toast({
      title: t('toast.updated'),
      description: t('toast.updatedDesc'),
    });

    loadUsers();
    return {};
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    try {
      await fetchApi(`/auth/admin/users/${deactivateTarget.id}`, {
        method: 'DELETE',
      });
      toast({
        title: t('toast.deactivated'),
        description: t('toast.deactivatedDesc'),
      });
      setDeactivateTarget(null);
      loadUsers();
    } catch (err) {
      toast({
        title: t('toast.error'),
        description: err instanceof Error ? err.message : t('toast.errorDesc'),
        variant: 'destructive',
      });
    }
  };

  const handleActivate = async (user: UserProfile) => {
    try {
      await fetchApi(`/auth/admin/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          is_active: true,
        }),
      });
      toast({
        title: 'User Activated',
        description: 'The user account has been successfully activated.',
      });
      loadUsers();
    } catch (err) {
      toast({
        title: t('toast.error'),
        description: err instanceof Error ? err.message : t('toast.errorDesc'),
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetchApi(`/auth/admin/users/${deleteTarget.id}/purge`, {
        method: 'DELETE',
      });
      toast({
        title: 'User Deleted',
        description: 'The user account has been permanently deleted.',
      });
      setDeleteTarget(null);
      loadUsers();
    } catch (err) {
      toast({
        title: t('toast.error'),
        description: err instanceof Error ? err.message : t('toast.errorDesc'),
        variant: 'destructive',
      });
    }
  };

  const handleResetPassword = async (user: UserProfile) => {
    try {
      const res = await fetchApi(`/auth/admin/users/${user.id}/reset-password`, {
        method: 'POST',
      }) as { temp_password: string };

      setPasswordResetResult({ user, temp_password: res.temp_password });
      toast({
        title: t('toast.passwordReset'),
        description: t('toast.passwordResetDesc'),
      });
      loadUsers();
    } catch (err) {
      toast({
        title: t('toast.error'),
        description: err instanceof Error ? err.message : t('toast.errorDesc'),
        variant: 'destructive',
      });
    }
  };

  const copyPassword = async () => {
    if (!passwordResetResult) return;
    try {
      await navigator.clipboard.writeText(passwordResetResult.temp_password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* noop */ }
  };

  const openCreate = () => {
    setFormMode('create');
    setEditUser(null);
    setFormOpen(true);
  };

  const openEdit = (user: UserProfile) => {
    setFormMode('edit');
    setEditUser(user);
    setFormOpen(true);
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.is_active).length;
  const adminUsers = users.filter(u => u.role === 'admin').length;
  const inactiveUsers = totalUsers - activeUsers;

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader title={t('title')} subtitle={t('subtitle')} />

        <main className="flex-1 p-3 sm:p-6 space-y-5 sm:space-y-6 overflow-y-auto">
          {/* Header Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {t('table.header.title', 'User Directory')}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t('table.userCount', { count: totalUsers })}
              </p>
            </div>
            <Button onClick={openCreate} className="gap-2 self-start sm:self-auto shadow-sm">
              <Plus className="w-4 h-4" />
              {t('addUser')}
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="neu-card p-4 rounded-2xl bg-card border border-border/50 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total Accounts</p>
                <h3 className="text-lg font-bold">{totalUsers}</h3>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className="neu-card p-4 rounded-2xl bg-card border border-border/50 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Active Users</p>
                <h3 className="text-lg font-bold">{activeUsers}</h3>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="neu-card p-4 rounded-2xl bg-card border border-border/50 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Admin Roles</p>
                <h3 className="text-lg font-bold">{adminUsers}</h3>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="neu-card p-4 rounded-2xl bg-card border border-border/50 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <UserX className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Deactivated</p>
                <h3 className="text-lg font-bold">{inactiveUsers}</h3>
              </div>
            </motion.div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-2xl border border-border/50 neu-card">
              <Shield className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">{t('table.empty')}</p>
            </div>
          ) : (
            <div className="neu-card rounded-2xl overflow-hidden border border-border/50 bg-card">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t('table.header.name')}
                      </th>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t('table.header.email')}
                      </th>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t('table.header.role')}
                      </th>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t('table.header.status')}
                      </th>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t('table.header.lastLogin')}
                      </th>
                      <th className="px-4 py-3.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t('table.header.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {users.map((user, i) => (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="hover:bg-muted/10 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className="font-semibold text-sm text-foreground">{user.name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted-foreground">{user.email}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted-foreground">{user.department || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={ROLE_COLORS[user.role] || 'outline'} className="capitalize">
                            {t(`role.${user.role}`)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge 
                            variant={user.is_active ? 'secondary' : 'destructive'}
                            className={cn(
                              user.is_active 
                                ? 'bg-green-500/10 text-green-500 hover:bg-green-500/15 border-green-500/20' 
                                : 'bg-red-500/10 text-red-500 hover:bg-red-500/15 border-red-500/20'
                            )}
                          >
                            {t(`status.${user.is_active ? 'active' : 'inactive'}`)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted-foreground">
                            {user.updated_at ? formatDate(user.updated_at) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => openEdit(user)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                {t('dialog.editTitle')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                                <KeyRound className="w-4 h-4 mr-2" />
                                {t('password.resetButton')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {user.is_active ? (
                                <DropdownMenuItem
                                  onClick={() => setDeactivateTarget(user)}
                                  className="text-warning focus:text-warning"
                                  disabled={user.id === currentUser?.id}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Deactivate User
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => handleActivate(user)}
                                  className="text-green-500 focus:text-green-500"
                                  disabled={user.id === currentUser?.id}
                                >
                                  <Check className="w-4 h-4 mr-2" />
                                  Activate User
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget(user)}
                                className="text-destructive focus:text-destructive"
                                disabled={user.id === currentUser?.id}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Create / Edit dialog */}
      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editUser}
        onSubmit={formMode === 'create' ? handleCreate : handleEdit}
        mode={formMode}
      />

      {/* Deactivate confirmation dialog */}
      <Dialog open={!!deactivateTarget} onOpenChange={(o) => !o && setDeactivateTarget(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              {t('confirm.deactivateTitle')}
            </DialogTitle>
            <DialogDescription>{t('confirm.deactivateDesc')}</DialogDescription>
          </DialogHeader>
          {deactivateTarget && (
            <div className="rounded-xl bg-muted/50 border border-border p-3 text-sm">
              <span className="font-medium">{deactivateTarget.name}</span>
              <span className="text-muted-foreground ml-2">({deactivateTarget.email})</span>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeactivateTarget(null)}>
              {t('dialog.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeactivate}>
              Deactivate User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this user? This action is irreversible and will delete their refresh sessions.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <div className="rounded-xl bg-muted/50 border border-border p-3 text-sm">
              <span className="font-medium">{deleteTarget.name}</span>
              <span className="text-muted-foreground ml-2">({deleteTarget.email})</span>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              {t('dialog.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password reset result dialog */}
      <Dialog open={!!passwordResetResult} onOpenChange={(o) => { if (!o) { setPasswordResetResult(null); setCopied(false); } }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{t('password.resetTitle')}</DialogTitle>
            <DialogDescription>{t('password.resetDesc')}</DialogDescription>
          </DialogHeader>
          {passwordResetResult && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="rounded-2xl bg-muted/50 border border-border p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">
                  {t('password.newPassword')}
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-lg bg-background border font-mono text-sm break-all">
                    {passwordResetResult.temp_password}
                  </code>
                  <Button variant="ghost" size="icon" onClick={copyPassword} className="shrink-0">
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('password.closeWhenReady')}
              </p>
              <DialogFooter>
                <Button onClick={() => { setPasswordResetResult(null); setCopied(false); }}>
                  {t('dialog.cancel')}
                </Button>
              </DialogFooter>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
