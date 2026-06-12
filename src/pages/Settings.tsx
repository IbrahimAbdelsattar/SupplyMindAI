import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { AIChatbot } from '@/components/chatbot/AIChatbot';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Currency } from '@/lib/currency';
import { Navigate } from 'react-router-dom';
import { Palette, Bell, Globe, Shield, User, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  const [notifications, setNotifications] = useState({
    stockAlerts: true,
    forecastUpdates: true,
    weeklyReports: true,
    systemUpdates: false,
  });
  
  const [region, setRegion] = useState('us');

  // Load saved settings from API on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { fetchApi } = await import('@/lib/api');
        const res = await fetchApi('/settings') as { settings: Record<string, unknown> };
        const s = res?.settings || {};
        if (s.notifications) setNotifications(prev => ({ ...prev, ...(s.notifications as typeof prev) }));
        if (s.region) setRegion(s.region as string);
        // Currency may be stored directly or within display object
        if (s.display && typeof (s.display as any).currency === 'string') {
          setCurrency((s.display as any).currency as Currency);
        } else if (typeof s.currency === 'string') {
          setCurrency(s.currency as Currency);
        }
      } catch {
        // Settings not available yet — use defaults
      }
    };
    if (isAuthenticated) loadSettings();
  }, [isAuthenticated, setCurrency]);


  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { fetchApi } = await import('@/lib/api');
      await fetchApi('/settings', {
        method: 'PUT',
        body: JSON.stringify({
          theme,
          notifications,
          region,
          display: { currency },
        }),
      });
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
          {/* Profile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <CardTitle className="text-base sm:text-lg">{t('settings:section.profile')}</CardTitle>
                </div>
                <CardDescription className="text-xs sm:text-sm">{t('settings:profileDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl sm:text-2xl font-bold text-primary">
                      {user?.name.charAt(0)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-base sm:text-lg font-semibold truncate">{user?.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                    <p className="text-xs sm:text-sm text-primary capitalize mt-0.5 sm:mt-1">
                      {t('settings:roleAccount', { role: user?.role })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Appearance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <CardTitle className="text-base sm:text-lg">{t('settings:section.appearance')}</CardTitle>
                </div>
                <CardDescription className="text-xs sm:text-sm">{t('settings:appearanceDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <Label className="text-sm sm:text-base">{t('settings:darkMode')}</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {t('settings:darkModeDescription')}
                    </p>
                  </div>
                  <Switch
                    checked={theme === 'dark'}
                    onCheckedChange={toggleTheme}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <CardTitle className="text-base sm:text-lg">{t('settings:section.notifications')}</CardTitle>
                </div>
                <CardDescription className="text-xs sm:text-sm">{t('settings:notificationsDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                {[
                  { key: 'stockAlerts', labelKey: 'settings:notifications.stockAlerts', descKey: 'settings:notifications.stockAlertsDesc' },
                  { key: 'forecastUpdates', labelKey: 'settings:notifications.forecastUpdates', descKey: 'settings:notifications.forecastUpdatesDesc' },
                  { key: 'weeklyReports', labelKey: 'settings:notifications.weeklyReports', descKey: 'settings:notifications.weeklyReportsDesc' },
                  { key: 'systemUpdates', labelKey: 'settings:notifications.systemUpdates', descKey: 'settings:notifications.systemUpdatesDesc' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <Label className="text-sm sm:text-base">{t(item.labelKey)}</Label>
                      <p className="text-xs sm:text-sm text-muted-foreground">{t(item.descKey)}</p>
                    </div>
                    <Switch
                      checked={notifications[item.key as keyof typeof notifications]}
                      onCheckedChange={(checked) =>
                        setNotifications((prev) => ({ ...prev, [item.key]: checked }))
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Regional Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <CardTitle className="text-base sm:text-lg">{t('settings:section.regionalSettings')}</CardTitle>
                </div>
                <CardDescription className="text-xs sm:text-sm">{t('settings:regionalSettingsDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">{t('settings:region')}</Label>
                    <Select value={region} onValueChange={setRegion}>
                      <SelectTrigger className="bg-background h-9 sm:h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="us">{t('settings:regions.us')}</SelectItem>
                        <SelectItem value="eu">{t('settings:regions.eu')}</SelectItem>
                        <SelectItem value="asia">{t('settings:regions.asia')}</SelectItem>
                        <SelectItem value="mena">{t('settings:regions.mena')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">{t('settings:currency')}</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="bg-background h-9 sm:h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="usd">{t('settings:currencies.usd')}</SelectItem>
                        <SelectItem value="eur">{t('settings:currencies.eur')}</SelectItem>
                        <SelectItem value="gbp">{t('settings:currencies.gbp')}</SelectItem>
                        <SelectItem value="egp">{t('settings:currencies.egp')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Role-based View */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <CardTitle className="text-base sm:text-lg">{t('settings:section.roleFeatures')}</CardTitle>
                </div>
                <CardDescription className="text-xs sm:text-sm">{t('settings:roleFeaturesDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {(user?.role === 'manager' ? [
                    { titleKey: 'settings:roleFeatures.executiveReports', descKey: 'settings:roleFeatures.executiveReportsDesc' },
                    { titleKey: 'settings:roleFeatures.budgetControls', descKey: 'settings:roleFeatures.budgetControlsDesc' },
                    { titleKey: 'settings:roleFeatures.teamManagement', descKey: 'settings:roleFeatures.teamManagementDesc' },
                    { titleKey: 'settings:roleFeatures.approvalWorkflows', descKey: 'settings:roleFeatures.approvalWorkflowsDesc' },
                  ] : [
                    { titleKey: 'settings:roleFeatures.technicalDetails', descKey: 'settings:roleFeatures.technicalDetailsDesc' },
                    { titleKey: 'settings:roleFeatures.dataExploration', descKey: 'settings:roleFeatures.dataExplorationDesc' },
                    { titleKey: 'settings:roleFeatures.modelConfiguration', descKey: 'settings:roleFeatures.modelConfigurationDesc' },
                    { titleKey: 'settings:roleFeatures.apiAccess', descKey: 'settings:roleFeatures.apiAccessDesc' },
                  ]).map((feature) => (
                    <div key={feature.titleKey} className="p-3 sm:p-4 rounded-xl border border-border bg-muted/50">
                      <p className="font-medium text-sm sm:text-base">{t(feature.titleKey)}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">{t(feature.descKey)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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

      <AIChatbot />
    </div>
  );
};

export default Settings;
