import { useTranslation } from 'react-i18next';
import { AlertTriangle, ClipboardList, PackageOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { MaterialPlan } from '@/lib/materialPlanning';

const requirementColumns = [
  { key: 'quantity_per_unit', label: 'perUnit' },
  { key: 'required', label: 'required' },
  { key: 'on_hand', label: 'onHand' },
  { key: 'to_buy', label: 'toBuy' },
  { key: 'remaining', label: 'remaining' },
  { key: 'first_shortage_period', label: 'firstShortage' },
] as const;

export function MaterialPlanResults({ plan }: { plan: MaterialPlan }) {
  const { t, i18n } = useTranslation('bom');
  const formatNumber = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 }).format;
  const monthFormatter = new Intl.DateTimeFormat(i18n.language, {
    month: 'short', year: 'numeric', timeZone: 'UTC',
  });
  const formatMonth = (period: string) => monthFormatter.format(new Date(`${period}-01T00:00:00Z`));
  const missingBalances = plan.materials.filter((material) => material.on_hand === null).length;
  const materialsToBuy = plan.materials.filter((material) => (material.to_buy ?? 0) > 0).length;
  const peakDemand = Math.max(1, ...plan.monthly_demand.map((month) => month.predicted_demand));
  const metrics = [
    { label: 'forecastDemand', value: plan.forecast_units, icon: ClipboardList, highlight: false },
    { label: 'materialsToBuy', value: materialsToBuy, icon: PackageOpen, highlight: materialsToBuy > 0 },
    { label: 'unknownBalances', value: missingBalances, icon: AlertTriangle, highlight: missingBalances > 0 },
  ] as const;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4" aria-live="polite">
        {metrics.map(({ label, value, icon: Icon, highlight }) => (
          <Card hoverLift={false} className="flex items-center gap-4 p-4 sm:p-5" key={label}>
            <span className={cn(
              'shrink-0 rounded-xl p-2.5',
              highlight ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300' : 'bg-primary/10 text-primary',
            )}>
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <dl>
              <dt className="text-sm font-medium text-muted-foreground">{t(label)}</dt>
              <dd className="text-2xl font-semibold leading-tight tabular-nums">{formatNumber(value)}</dd>
            </dl>
          </Card>
        ))}
      </div>

      <Card hoverLift={false} className="p-0">
        <CardHeader className="space-y-2 p-4 sm:p-6">
          <h2 className="text-lg font-semibold">{t('requirements')}</h2>
          <CardDescription>{t('requirementsDescription')}</CardDescription>
          {missingBalances > 0 && (
            <p className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {t('unknownNotice')}
            </p>
          )}
          {missingBalances === 0 && materialsToBuy === 0 && (
            <p className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-900 dark:text-emerald-200">
              {t('noPurchases')}
            </p>
          )}
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="hidden lg:block">
            <Table aria-label={t('requirements')} className="tabular-nums">
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" className="ps-2 text-start">{t('material')}</TableHead>
                  {requirementColumns.map(({ key, label }) => (
                    <TableHead scope="col" className="px-2 text-end" key={key}>{t(label)}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {plan.materials.map((material) => (
                  <TableRow key={material.material_id}>
                    <th scope="row" className="p-2 text-start font-medium">
                      {material.material_name}
                      <span className="block text-xs font-normal text-muted-foreground"><bdi>{material.material_id}</bdi></span>
                    </th>
                    {requirementColumns.map(({ key }) => (
                      <TableCell className="px-2 text-end" key={key}>
                        <RequirementValue
                          value={material[key]}
                          highlight={key === 'to_buy' && (material.to_buy ?? 0) > 0}
                          unknown={key === 'on_hand' ? t('unknown') : '—'}
                          formatNumber={formatNumber}
                          formatMonth={formatMonth}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:hidden">
            {plan.materials.map((material) => (
              <li key={material.material_id} className="rounded-xl border border-border/70 p-4">
                <h3 className="font-medium">{material.material_name}</h3>
                <p className="mb-3 text-xs text-muted-foreground"><bdi>{material.material_id}</bdi></p>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  {requirementColumns.map(({ key, label }) => (
                    <div key={key}>
                      <dt className="text-xs text-muted-foreground">{t(label)}</dt>
                      <dd className="mt-0.5 tabular-nums">
                        <RequirementValue
                          value={material[key]}
                          highlight={key === 'to_buy' && (material.to_buy ?? 0) > 0}
                          unknown={key === 'on_hand' ? t('unknown') : '—'}
                          formatNumber={formatNumber}
                          formatMonth={formatMonth}
                        />
                      </dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card hoverLift={false} className="p-0">
        <CardHeader className="p-4 sm:p-6">
          <h2 className="text-lg font-semibold">{t('monthlyDemand')}</h2>
          <CardDescription>{t('monthlyDemandDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
          <ul className="space-y-3">
            {plan.monthly_demand.map(({ period, predicted_demand }) => (
              <li key={period} className="grid grid-cols-[7rem_minmax(0,1fr)_auto] items-center gap-3 text-sm sm:gap-5">
                <time dateTime={period} className="font-medium">{formatMonth(period)}</time>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                  <div className="h-full rounded-full bg-primary/80" style={{ width: `${predicted_demand / peakDemand * 100}%` }} />
                </div>
                <span className="min-w-[3rem] text-end font-medium tabular-nums">{formatNumber(predicted_demand)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}

function RequirementValue({ value, highlight, unknown, formatNumber, formatMonth }: {
  value: number | string | null;
  highlight: boolean;
  unknown: string;
  formatNumber: (value: number) => string;
  formatMonth: (period: string) => string;
}) {
  const text = typeof value === 'number' ? formatNumber(value) : value ? formatMonth(value) : unknown;
  return (
    <span className={cn(
      value === null && 'text-muted-foreground',
      highlight && 'font-semibold text-amber-800 dark:text-amber-300',
    )}>
      {text}
    </span>
  );
}
