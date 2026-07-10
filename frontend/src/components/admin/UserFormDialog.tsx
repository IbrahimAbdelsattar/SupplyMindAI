import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserProfile | null;
  onSubmit: (data: {
    name: string;
    email: string;
    role: string;
    department: string;
    password?: string;
  }) => Promise<{ temp_password?: string }>;
  mode: 'create' | 'edit';
}

const ROLES = ['admin', 'manager', 'analyst', 'viewer'] as const;

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  onSubmit,
  mode,
}: UserFormDialogProps) {
  const { t } = useTranslation('admin');
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('analyst');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && user) {
        setName(user.name);
        setEmail(user.email);
        setRole(user.role);
        setDepartment(user.department || '');
      } else {
        setName('');
        setEmail('');
        setRole('analyst');
        setDepartment('');
        setPassword('');
      }
      setTempPassword(null);
      setCopied(false);
    }
  }, [open, mode, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await onSubmit({ name, email, role, department, password: password || undefined });
      if (result?.temp_password) {
        setTempPassword(result.temp_password);
      } else {
        onOpenChange(false);
      }
    } catch {
      toast({
        title: t('toast.error'),
        description: t('toast.errorDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyPassword = async () => {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: t('toast.error'),
        description: 'Failed to copy.',
        variant: 'destructive',
      });
    }
  };

  const isEditing = mode === 'edit';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('dialog.editTitle') : t('dialog.createTitle')}
          </DialogTitle>
          <DialogDescription>
            {tempPassword
              ? t('dialog.createDesc')
              : isEditing
                ? t('dialog.editDesc')
                : t('dialog.createDesc')}
          </DialogDescription>
        </DialogHeader>

        {tempPassword ? (
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
                  {tempPassword}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyPassword}
                  className="shrink-0"
                >
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
              <Button onClick={() => onOpenChange(false)}>
                {t('dialog.cancel')}
              </Button>
            </DialogFooter>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="user-name" className="text-sm font-medium">
                {t('dialog.nameLabel')}
              </label>
              <input
                id="user-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('dialog.namePlaceholder')}
                required
                disabled={isSubmitting}
                className="neu-basin w-full px-4 py-2.5 rounded-xl bg-background text-foreground placeholder:text-muted-foreground/60 border border-border/50 focus:border-primary/50 focus:ring-0 focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="user-email" className="text-sm font-medium">
                {t('dialog.emailLabel')}
              </label>
              <input
                id="user-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('dialog.emailPlaceholder')}
                required
                disabled={isSubmitting || isEditing}
                className="neu-basin w-full px-4 py-2.5 rounded-xl bg-background text-foreground placeholder:text-muted-foreground/60 border border-border/50 focus:border-primary/50 focus:ring-0 focus:outline-none transition-colors disabled:opacity-60"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('dialog.roleLabel')}
              </label>
              <Select value={role} onValueChange={setRole} disabled={isSubmitting}>
                <SelectTrigger className="neu-basin rounded-xl">
                  <SelectValue placeholder={t('dialog.rolePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {t(`role.${r}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="user-dept" className="text-sm font-medium">
                {t('dialog.departmentLabel')}
              </label>
              <input
                id="user-dept"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder={t('dialog.departmentPlaceholder')}
                disabled={isSubmitting}
                className="neu-basin w-full px-4 py-2.5 rounded-xl bg-background text-foreground placeholder:text-muted-foreground/60 border border-border/50 focus:border-primary/50 focus:ring-0 focus:outline-none transition-colors"
              />
            </div>

            {!isEditing && (
              <div className="space-y-2">
                <label htmlFor="user-password" className="text-sm font-medium">
                  {t('dialog.passwordLabel', 'Password (optional)')}
                </label>
                <input
                  id="user-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('dialog.passwordPlaceholder', 'Leave blank to auto-generate')}
                  disabled={isSubmitting}
                  className="neu-basin w-full px-4 py-2.5 rounded-xl bg-background text-foreground placeholder:text-muted-foreground/60 border border-border/50 focus:border-primary/50 focus:ring-0 focus:outline-none transition-colors"
                />
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {t('dialog.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isEditing ? t('dialog.updating') : t('dialog.creating')}
                  </>
                ) : (
                  isEditing ? t('dialog.update') : t('dialog.create')
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
