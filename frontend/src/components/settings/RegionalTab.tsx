import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCurrency } from '@/contexts/CurrencyContext';

export const RegionalTab = () => {
  const { t } = useTranslation();
  const { currency, setCurrency } = useCurrency();

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="text-base sm:text-lg">{t('settings:section.currencySettings')}</CardTitle>
        <CardDescription className="text-xs sm:text-sm">{t('settings:currencySettingsDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-w-sm">
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
      </CardContent>
    </Card>
  );
};
