import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogOut } from 'lucide-react';
import { SignOutButton, useUser } from '@clerk/clerk-react';

type ProfileTabProps = {
  user: { name?: string; email?: string; role?: string } | null;
  onNameChange?: (name: string) => void;
};

export const ProfileTab = ({ user, onNameChange }: ProfileTabProps) => {
  const { t } = useTranslation();
  const { user: clerkUser } = useUser();

  const displayName = user?.name || clerkUser?.fullName || clerkUser?.firstName || 'Account';
  const displayEmail = user?.email || clerkUser?.primaryEmailAddress?.emailAddress || '';
  const imageUrl = clerkUser?.imageUrl;

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="text-base sm:text-lg">{t('settings:section.profile')}</CardTitle>
        <CardDescription className="text-xs sm:text-sm">{t('settings:profileDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {imageUrl ? (
                <img src={imageUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl sm:text-2xl font-bold text-primary">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-base sm:text-lg font-semibold truncate">{displayName}</p>
              <p className="text-sm text-muted-foreground truncate">{displayEmail}</p>
              <p className="text-xs sm:text-sm text-primary capitalize mt-0.5 sm:mt-1">
                {t('settings:roleAccount', { role: user?.role })}
              </p>
            </div>
          </div>

          <SignOutButton>
            <Button variant="destructive" className="w-full sm:w-auto gap-2">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </SignOutButton>
        </div>

        <div className="space-y-4 max-w-md pt-4 border-t border-border/50">
          <div className="space-y-2">
            <Label htmlFor="name">{t('settings:name', 'Name')}</Label>
            <Input
              id="name"
              value={displayName}
              onChange={(e) => onNameChange?.(e.target.value)}
              placeholder="Your name"
              className="neu-basin"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t('settings:email', 'Email')}</Label>
            <Input
              id="email"
              value={displayEmail}
              disabled
              className="neu-basin opacity-50 cursor-not-allowed"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
