import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Save, User, Palette, Globe, Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useToast } from '@/hooks/use-toast';
import { ProfileTab } from '@/components/settings/ProfileTab';
import { AppearanceTab } from '@/components/settings/AppearanceTab';
import { RegionalTab } from '@/components/settings/RegionalTab';
import { NotificationsTab } from '@/components/settings/NotificationsTab';
import { useUser } from '@clerk/clerk-react';

const Settings = () => {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { currency } = useCurrency();
  const { toast } = useToast();
  const { user: clerkUser } = useUser();
  const [isSaving, setIsSaving] = useState(false);

  // User state
  const [user, setUser] = useState<{ name?: string; email?: string; role?: string } | null>(null);

  const [notifications, setNotifications] = useState({
    stockAlerts: true,
    forecastUpdates: true,
    weeklyReports: true,
    systemUpdates: false,
  });

  const [region, setRegion] = useState('us');

  // Load saved settings and user data from API on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const { fetchApi } = await import('@/lib/api');
        const [settingsRes, userRes] = await Promise.all([
          fetchApi('/settings'),
          fetchApi('/system/user'),
        ]);
        const s = (settingsRes as { settings: Record<string, unknown> })?.settings || {};
        if (s.notifications) setNotifications(prev => ({ ...prev, ...(s.notifications as typeof prev) }));
        if (s.region) setRegion(s.region as string);
        const u = (userRes as { user: { name?: string; email?: string; role?: string } })?.user;
        if (u) setUser(u);
      } catch {
        // Use defaults if API fails
      }
    };
    loadData();
  }, []);


  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Determine the effective name to save
      const effectiveName = user?.name || clerkUser?.fullName || clerkUser?.firstName || '';

      const { fetchApi } = await import('@/lib/api');
      await fetchApi('/settings', {
        method: 'PUT',
        body: JSON.stringify({
          theme,
          notifications,
          region,
          display: { currency },
          language: i18n.language,
          name: effectiveName,
        }),
      });

      // Sync name back to Clerk
      if (effectiveName && clerkUser && effectiveName !== clerkUser.fullName) {
        const parts = effectiveName.trim().split(' ');
        const firstName = parts[0];
        const lastName = parts.slice(1).join(' ');
        await clerkUser.update({ firstName, lastName: lastName || undefined });
      }

      toast({
        title: t('settings:toast.saved'),
        description: t('settings:toast.savedDesc'),
      });
    } catch {
      toast({
        title: t('settings:toast.error'),
        description: t('settings:toast.errorDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader
          title={t('settings:title')}
          subtitle={t('settings:subtitle')}
        />

        <main className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="profile" className="gap-2">
                  <User className="w-4 h-4 hidden sm:block" />
                  <span className="hidden sm:inline">{t('settings:section.profile')}</span>
                  <span className="sm:hidden">{t('settings:section.profile')}</span>
                </TabsTrigger>
                <TabsTrigger value="appearance" className="gap-2">
                  <Palette className="w-4 h-4 hidden sm:block" />
                  <span className="hidden sm:inline">{t('settings:section.appearance')}</span>
                  <span className="sm:hidden">{t('settings:section.appearance')}</span>
                </TabsTrigger>
                <TabsTrigger value="regional" className="gap-2">
                  <Globe className="w-4 h-4 hidden sm:block" />
                  <span className="hidden sm:inline">{t('settings:section.regionalSettings')}</span>
                  <span className="sm:hidden">{t('settings:section.regionalSettings')}</span>
                </TabsTrigger>
                <TabsTrigger value="notifications" className="gap-2">
                  <Bell className="w-4 h-4 hidden sm:block" />
                  <span className="hidden sm:inline">{t('settings:section.notifications')}</span>
                  <span className="sm:hidden">{t('settings:section.notifications')}</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile">
                <ProfileTab
                  user={user}
                  onNameChange={(name) => setUser(prev => prev ? { ...prev, name } : null)}
                />
              </TabsContent>

              <TabsContent value="appearance">
                <AppearanceTab />
              </TabsContent>

              <TabsContent value="regional">
                <RegionalTab region={region} onRegionChange={setRegion} />
              </TabsContent>

              <TabsContent value="notifications">
                <NotificationsTab
                  notifications={notifications}
                  onNotificationsChange={setNotifications}
                />
              </TabsContent>
            </Tabs>
          </motion.div>

          {/* Save Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="flex justify-end pb-4"
          >
            <Button onClick={handleSave} size="lg" className="gap-2 w-full sm:w-auto" disabled={isSaving}>
              <Save className="w-4 h-4" />
              {isSaving ? t('settings:saving') : t('settings:saveSettings')}
            </Button>
          </motion.div>
        </main>
      </div>

    </div>
  );
};

export default Settings;
