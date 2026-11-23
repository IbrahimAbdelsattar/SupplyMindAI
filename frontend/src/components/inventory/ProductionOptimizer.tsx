import { useRef, useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api';
import type { OptimizationTarget, ProductionOptimizationResult } from '@/lib/productionOptimization';
import { ProductionOptimizationResults } from './ProductionOptimizationResults';

type Product = { product_id: string; product_name: string };
type SolveRequest = {
  targets: OptimizationTarget[];
  daily_minutes: number;
  extra_daily_minutes: number | null;
  budget_egp: string | null;
  strict_targets: boolean;
};

const targetFields = [
  { key: 'units', label: 'targetUnits', max: 100000 },
  { key: 'due_day', label: 'solver.dueDay', max: 60 },
  { key: 'minutes_per_unit', label: 'solver.minutesPerUnit', max: 1440 },
  { key: 'priority', label: 'solver.priority', max: 10, defaultValue: 1 },
] as const;

export function ProductionOptimizer({ products }: { products: Product[] }) {
  const { t } = useTranslation('bom');
  const nextId = useRef(1);
  const [rows, setRows] = useState([{ id: 0, product: '' }]);
  const [capacityError, setCapacityError] = useState(false);
  const run = useMutation({
    mutationFn: (payload: SolveRequest) => apiFetch<ProductionOptimizationResult>(
      '/inventory/production-plan/optimize', { method: 'POST', body: JSON.stringify(payload) },
    ),
  });

  function clearResult() {
    setCapacityError(false);
    if (!run.isIdle) run.reset();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const dailyMinutes = Math.round(Number(form.get('line-hours')) * 60);
    const extraMinutes = Math.round(Number(form.get('extra-hours')) * 60);
    if (dailyMinutes + extraMinutes > 1440) {
      setCapacityError(true);
      return;
    }
    run.mutate({
      daily_minutes: dailyMinutes,
      extra_daily_minutes: extraMinutes || null,
      budget_egp: form.get('budget')?.toString() || null,
      strict_targets: form.has('strict'),
      targets: rows.map(({ id, product }) => ({
        product_id: product,
        units: Number(form.get(`${id}-units`)),
        due_day: Number(form.get(`${id}-due_day`)),
        minutes_per_unit: Number(form.get(`${id}-minutes_per_unit`)),
        priority: Number(form.get(`${id}-priority`)),
      })),
    });
  }

  return (
    <>
      <Card hoverLift={false} className="p-0">
        <CardHeader className="p-4 sm:p-6">
          <h2 className="text-lg font-semibold">{t('solver.mode')}</h2>
          <CardDescription>{t('solver.description')}</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
          <form onSubmit={submit} onChange={clearResult}>
            <fieldset disabled={run.isPending} className="min-w-0 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="line-hours">{t('solver.lineHours')}</Label>
                  <Input id="line-hours" name="line-hours" type="number" min={0} max={24} step={0.25} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="optimization-budget">{t('solver.budget')}</Label>
                  <Input id="optimization-budget" name="budget" type="number" min={0} max={999999999.99}
                    step={0.01} placeholder={t('optional')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="extra-hours">{t('solver.extraHours')}</Label>
                  <Input id="extra-hours" name="extra-hours" type="number" min={0.25} max={24} step={0.25}
                    placeholder={t('optional')} aria-invalid={capacityError} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input id="strict-targets" name="strict" type="checkbox" className="size-4 accent-primary" />
                <Label htmlFor="strict-targets">{t('solver.strict')}</Label>
              </div>
              <p className="text-sm text-muted-foreground">{t('solver.dayBasis')}</p>
              {rows.map(({ id, product }, index) => (
                <fieldset key={id} className="min-w-0 space-y-3 rounded-md border p-3">
                  <legend className="px-1 text-sm font-medium">{t('solver.target', { number: index + 1 })}</legend>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <div className="space-y-2">
                      <Label htmlFor={`opt-product-${id}`}>{t('forecasting:product')}</Label>
                      <select id={`opt-product-${id}`} value={product} required
                        className="neu-basin h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring"
                        onChange={(event) => setRows(rows.map((row) => row.id === id ? { ...row, product: event.target.value } : row))}>
                        <option value="">{t('chooseProduct')}</option>
                        {products.map((item) => (
                          <option key={item.product_id} value={item.product_id}
                            disabled={rows.some((row) => row.id !== id && row.product === item.product_id)}>
                            {item.product_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {targetFields.map((field) => (
                      <div key={field.key} className="space-y-2">
                        <Label htmlFor={`${id}-${field.key}`}>{t(field.label)}</Label>
                        <Input id={`${id}-${field.key}`} name={`${id}-${field.key}`} type="number"
                          min={1} max={field.max} step={1} required
                          defaultValue={'defaultValue' in field ? field.defaultValue : undefined} />
                      </div>
                    ))}
                  </div>
                  {rows.length > 1 && (
                    <Button type="button" size="sm" variant="outline" onClick={() => {
                      setRows(rows.filter((row) => row.id !== id));
                      clearResult();
                    }}>{t('solver.removeTarget', { number: index + 1 })}</Button>
                  )}
                </fieldset>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" disabled={rows.length >= Math.min(products.length, 12)} onClick={() => {
                  setRows([...rows, { id: nextId.current++, product: '' }]);
                  clearResult();
                }}>{t('solver.addTarget')}</Button>
                <Button type="submit">{t('solver.run')}</Button>
              </div>
            </fieldset>
          </form>
          {capacityError && <p role="alert" className="mt-3 text-sm text-destructive">{t('solver.capacityError')}</p>}
          {run.isPending && <p role="status" className="mt-3 text-sm text-muted-foreground">{t('optimizingProduction')}</p>}
          {run.isError && <p role="alert" className="mt-3 text-sm text-destructive">{t('solver.requestError')}</p>}
        </CardContent>
      </Card>
      {run.data && <ProductionOptimizationResults result={run.data} products={products} />}
    </>
  );
}
