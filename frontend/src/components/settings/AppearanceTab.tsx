import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTheme } from '@/contexts/ThemeContext';

export const AppearanceTab = () => {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  const handleLanguageChange = async (lang: string) => {
    await i18n.changeLanguage(lang);
    document.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  };

  // Sync language to backend on change
  useEffect(() => {
    if (!i18n.language) return;
    import('@/lib/api').then(({ fetchApi }) => {
      fetchApi('/settings', {
        method: 'PUT',
        body: JSON.stringify({ language: i18n.language }),
      }).catch(() => {});
    });
  }, [i18n.language]);

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="text-base sm:text-lg">{t('settings:section.appearance')}</CardTitle>
        <CardDescription className="text-xs sm:text-sm">{t('settings:appearanceDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Dark Mode */}
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

        {/* Language */}
        <div className="space-y-2">
          <Label className="text-xs sm:text-sm">{t('settings:language')}</Label>
          <Select value={i18n.language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="bg-background h-9 sm:h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="en">{t('settings:languages.en')}</SelectItem>
              <SelectItem value="ar">{t('settings:languages.ar')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};
