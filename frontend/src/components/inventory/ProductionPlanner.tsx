import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api';
import type { ProductionPlan } from '@/lib/materialPlanning';

const quantityLimit = 2_147_483_647;

export function ProductionPlanner({ selection, onPlan }: {
  selection: URLSearchParams;
  onPlan: (selection: URLSearchParams) => void;
}) {
  const { t } = useTranslation('bom');
  const product = selection.get('product') ?? '';
  const units = selection.get('units') ?? '';
  const daily = selection.get('daily') ?? '';
  const deadline = selection.get('deadline') ?? '';
  const plan = useQuery({
    queryKey: ['production-plan', product, units, daily, deadline],
    queryFn: ({ signal }) => {
      const query = new URLSearchParams({ product_id: product, target_units: units });
      if (daily) query.set('daily_capacity', daily);
      if (deadline) query.set('deadline_days', deadline);
      return apiFetch<ProductionPlan>(`/inventory/production-plan?${query}`, { signal });
    },
    enabled: !!(product && units),
    retry: false,
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const next = new URLSearchParams(selection);
    for (const key of ['units', 'daily', 'deadline']) {
      const value = values.get(key)?.toString();
      if (value) next.set(key, String(Number(value)));
      else next.delete(key);
    }
    if (next.toString() === selection.toString()) void plan.refetch();
    else onPlan(next);
  }

  return (
    <>
      <Card hoverLift={false} className="p-0">
        <CardHeader className="p-4 sm:p-6">
          <h2 className="text-lg font-semibold">{t('productionMode')}</h2>
          <CardDescription>{t('productionDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="production-units">{t('targetUnits')}</Label>
              <Input id="production-units" name="units" type="number" min={1} max={quantityLimit}
                step={1} inputMode="numeric" required defaultValue={units} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="production-daily">{t('dailyCapacity')}</Label>
              <Input id="production-daily" name="daily" type="number" min={1} max={quantityLimit}
                step={1} inputMode="numeric" defaultValue={daily} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="production-deadline">{t('deadlineDays')}</Label>
              <Input id="production-deadline" name="deadline" type="number" min={1} max={quantityLimit}
                step={1} inputMode="numeric" placeholder={t('optional')} defaultValue={deadline} />
            </div>
            <div className="sm:col-span-3">
              <Button type="submit" disabled={plan.isFetching}>{t('optimizeProduction')}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {units && plan.isPending && <p role="status" className="px-2 text-sm text-muted-foreground">{t('optimizingProduction')}</p>}
      {plan.isError && <p role="alert" className="px-2 text-sm text-destructive">{t('productionError')}</p>}
      {plan.data && !plan.isError && <ProductionResults result={plan.data} />}
    </>
  );
}

function ProductionResults({ result }: { result: ProductionPlan }) {
  const { t, i18n } = useTranslation('bom');
  const number = new Intl.NumberFormat(i18n.language).format;
  const price = new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'EGP' }).format;
  const unknown = result.materials.some((material) => material.on_hand === null);
  const missingQuote = result.materials.some((material) => (material.to_buy ?? 0) > 0 && !material.supplier_name);
  const amount = (value: string | null) => value === null ? '—' : price(Number(value));
  const metrics = [
    { label: 'minimumSpend', value: amount(result.new_material_spend) },
    { label: 'fullPurchaseCost', value: amount(result.full_purchase_cost) },
    { label: 'earliestCompletion', value: result.completion_days === null ? '—' : number(result.completion_days) },
  ];

  return (
    <>
      <section aria-labelledby="production-result" className="space-y-3">
        <h2 id="production-result" className="px-1 text-lg font-semibold">
          {t('productionResult', { units: number(result.target_units) })}
        </h2>
        <dl className="grid gap-3 sm:grid-cols-3">
          {metrics.map(({ label, value }) => (
            <Card key={label} hoverLift={false} className="space-y-1 p-4">
              <dt className="text-sm text-muted-foreground">{t(label)}</dt>
              <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
            </Card>
          ))}
        </dl>
        <p className="px-1 text-sm text-muted-foreground">{t('costBasis')}</p>
        {unknown && (
          <p role="status" className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
            {t('unknownProductionStock')}
          </p>
        )}
        {missingQuote && (
          <p role="status" className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
            {t('missingProductionQuotes')}
          </p>
        )}
      </section>

      <Card hoverLift={false} className="p-0">
        <CardHeader className="p-4 sm:p-6">
          <h2 className="text-lg font-semibold">{t('stockAndOrders')}</h2>
          <CardDescription>{t('stockAndOrdersDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
          <ul className="divide-y divide-border rounded-xl border border-border">
            {result.materials.map((material) => (
              <li key={material.material_id} className="grid items-start gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <div>
                  <h3 className="font-medium">{material.material_name}</h3>
                  {(material.to_buy ?? 0) > 0 && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {material.supplier_name ?? t('unknownSupplier')}
                      {material.lead_time_days !== null && (
                        <> · {t('leadDays', { days: number(material.lead_time_days) })}</>
                      )}
                    </p>
                  )}
                </div>
                <dl className="grid grid-cols-2 gap-2 text-sm tabular-nums sm:grid-cols-4">
                  <div><dt className="text-muted-foreground">{t('required')}</dt><dd>{number(material.required)}</dd></div>
                  <div><dt className="text-muted-foreground">{t('onHand')}</dt><dd>{material.on_hand === null ? t('unknown') : number(material.on_hand)}</dd></div>
                  <div><dt className="text-muted-foreground">{t('toBuy')}</dt><dd className="font-semibold">{material.to_buy === null ? '—' : number(material.to_buy)}</dd></div>
                  <div><dt className="text-muted-foreground">{t('purchaseCost')}</dt><dd>{amount(material.purchase_cost)}</dd></div>
                </dl>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card hoverLift={false} className="p-0">
        <CardHeader className="p-4 sm:p-6">
          <h2 className="text-lg font-semibold">{t('productionSchedule')}</h2>
          {result.daily_capacity !== null && (
            <CardDescription>{t('capacitySummary', { capacity: number(result.daily_capacity) })}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4 sm:px-6 sm:pb-6">
          {result.completion_days === null ? (
            <p className="text-sm text-muted-foreground">{t(result.daily_capacity === null ? 'capacityMissing' : 'scheduleUnavailable')}</p>
          ) : (
            <>
              {result.deadline_days !== null && (
                <p className="text-sm font-medium">
                  {result.completion_days <= result.deadline_days
                    ? t('deadlineMet')
                    : t('missedDeadline', {
                      count: result.completion_days - result.deadline_days,
                      days: number(result.completion_days - result.deadline_days),
                    })}
                </p>
              )}
              <ol className="divide-y divide-border rounded-xl border border-border">
                {result.phases.map((phase) => (
                  <li key={phase.first_day} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
                    <span>{phase.first_day === phase.last_day
                      ? t('productionDay', { day: number(phase.first_day) })
                      : t('productionDays', { first: number(phase.first_day), last: number(phase.last_day) })}</span>
                    <span className="font-semibold tabular-nums">{t('produceUnits', { units: number(phase.units) })}</span>
                  </li>
                ))}
              </ol>
              <p className="text-sm text-muted-foreground">{t('scheduleBasis')}</p>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
