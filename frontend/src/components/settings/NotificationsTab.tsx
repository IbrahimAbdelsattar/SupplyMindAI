import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

type NotificationSettings = {
  stockAlerts: boolean;
  forecastUpdates: boolean;
  weeklyReports: boolean;
  systemUpdates: boolean;
};

type NotificationsTabProps = {
  notifications: NotificationSettings;
  onNotificationsChange: (notifications: NotificationSettings) => void;
};

export const NotificationsTab = ({ notifications, onNotificationsChange }: NotificationsTabProps) => {
  const { t } = useTranslation();

  const handleToggle = (key: keyof NotificationSettings) => {
    onNotificationsChange({
      ...notifications,
      [key]: !notifications[key],
    });
  };

  const items = [
    { key: 'stockAlerts' as const, labelKey: 'settings:notifications.stockAlerts', descKey: 'settings:notifications.stockAlertsDesc' },
    { key: 'forecastUpdates' as const, labelKey: 'settings:notifications.forecastUpdates', descKey: 'settings:notifications.forecastUpdatesDesc' },
    { key: 'weeklyReports' as const, labelKey: 'settings:notifications.weeklyReports', descKey: 'settings:notifications.weeklyReportsDesc' },
    { key: 'systemUpdates' as const, labelKey: 'settings:notifications.systemUpdates', descKey: 'settings:notifications.systemUpdatesDesc' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="text-base sm:text-lg">{t('settings:section.notifications')}</CardTitle>
        <CardDescription className="text-xs sm:text-sm">{t('settings:notificationsDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <Label className="text-sm sm:text-base">{t(item.labelKey)}</Label>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {t(item.descKey)}
              </p>
            </div>
            <Switch
              checked={notifications[item.key]}
              onCheckedChange={() => handleToggle(item.key)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
