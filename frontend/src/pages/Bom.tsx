import { useQuery } from '@tanstack/react-query';
import { Boxes, ChartNoAxesCombined } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { MaterialPlanResults } from '@/components/inventory/MaterialPlanResults';
import { ProductionOptimizer } from '@/components/inventory/ProductionOptimizer';
import { ProductionPlanner } from '@/components/inventory/ProductionPlanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api';
import { FORECAST_HORIZONS, forecastHorizon, forecastSelection, type MaterialPlan } from '@/lib/materialPlanning';

type Product = { product_id: string; product_name: string };

const selectClassName = 'neu-basin h-11 w-full rounded-md border border-input bg-background ps-3 pe-7 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60';

export default function Bom() {
  const { t } = useTranslation('bom');
  const [params, setParams] = useSearchParams();
  const products = useQuery({
    queryKey: ['products'],
    queryFn: ({ signal }) => apiFetch<Product[]>('/data/products', { signal }),
  });
  const requestedProduct = params.get('product');
  const productionMode = params.get('mode') === 'production';
  const optimizationMode = params.get('mode') === 'optimize';
  const forecastMode = !productionMode && !optimizationMode;
  const productId = products.data?.find((product) => product.product_id === requestedProduct)?.product_id
    ?? products.data?.[0]?.product_id ?? '';
  const horizon = forecastHorizon(params.get('horizon'));
  const query = useQuery({
    queryKey: ['material-plan', productId, horizon],
    queryFn: ({ signal }) => {
      const search = new URLSearchParams({ product_id: productId, horizon_days: horizon });
      return apiFetch<MaterialPlan>(`/inventory/material-plan?${search}`, { signal });
    },
    enabled: !!productId && forecastMode,
    retry: false,
  });
  const selection = forecastSelection(productId, horizon);
  const planningSelection = new URLSearchParams(params);
  planningSelection.set('product', productId);
  planningSelection.set('horizon', horizon);
  const inventorySelection = new URLSearchParams(forecastMode ? selection : planningSelection);
  inventorySelection.set('view', 'raw-materials');

  function changeSelection(key: string, value: string) {
    const next = new URLSearchParams(planningSelection);
    next.set(key, value);
    setParams(next, { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader title={t('title')} subtitle={t('subtitle')} />
        <main className="mx-auto w-full max-w-screen-2xl flex-1 space-y-4 px-3 pb-8 pt-3 sm:space-y-5 sm:px-6 sm:pt-6">
          <Card hoverLift={false} className="p-0">
            <CardHeader className="flex flex-col gap-3 space-y-0 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <h2 className="text-lg font-semibold">{t('controls')}</h2>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to={{ pathname: '/forecasting', search: selection.toString() }}>
                    <ChartNoAxesCombined aria-hidden="true" />
                    {t('forecastLink')}
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to={{ pathname: '/inventory', search: inventorySelection.toString() }}>
                    <Boxes aria-hidden="true" />
                    {t('inventoryLink')}
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 px-4 pb-4 sm:max-w-2xl sm:px-6 sm:pb-6">
              <div role="group" aria-label={t('planningMode')} className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant={forecastMode ? 'default' : 'outline'}
                  aria-pressed={forecastMode} onClick={() => changeSelection('mode', 'forecast')}>
                  {t('forecastMode')}
                </Button>
                <Button type="button" size="sm" variant={productionMode ? 'default' : 'outline'}
                  aria-pressed={productionMode} onClick={() => changeSelection('mode', 'production')}>
                  {t('productionMode')}
                </Button>
                <Button type="button" size="sm" variant={optimizationMode ? 'default' : 'outline'}
                  aria-pressed={optimizationMode} onClick={() => changeSelection('mode', 'optimize')}>
                  {t('solver.mode')}
                </Button>
              </div>
              {!optimizationMode && <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bom-product">{t('forecasting:product')}</Label>
                  <select
                    id="bom-product"
                    className={selectClassName}
                    value={productId}
                    disabled={!products.data?.length}
                    onChange={(event) => changeSelection('product', event.target.value)}
                  >
                    {!productId && <option value="">{t('chooseProduct')}</option>}
                    {products.data?.map((product) => (
                      <option key={product.product_id} value={product.product_id}>{product.product_name}</option>
                    ))}
                  </select>
                </div>
                {forecastMode && (
                  <div className="space-y-2">
                    <Label htmlFor="bom-horizon">{t('forecasting:horizonLabel')}</Label>
                    <select
                      id="bom-horizon"
                      className={selectClassName}
                      value={horizon}
                      onChange={(event) => changeSelection('horizon', event.target.value)}
                    >
                      {FORECAST_HORIZONS.map(({ value, labelKey }) => (
                        <option key={value} value={value}>{t(labelKey)}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>}
            </CardContent>
          </Card>

          {products.isPending && <p role="status" className="px-2 text-sm text-muted-foreground">{t('loadingProducts')}</p>}
          {products.isSuccess && !productId && <p className="px-2 text-sm text-muted-foreground">{t('noProducts')}</p>}
          {(products.isError || (forecastMode && query.isError)) && (
            <Card hoverLift={false} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <p role="alert" className="text-sm text-destructive">{t(products.isError ? 'productsError' : 'planError')}</p>
              <Button variant="outline" size="sm" onClick={() => void (products.isError ? products.refetch() : query.refetch())}>
                {t('retry')}
              </Button>
            </Card>
          )}
          {forecastMode && !!productId && query.isPending && (
            <p role="status" className="px-2 text-sm text-muted-foreground">{t('loadingPlan')}</p>
          )}
          {forecastMode && query.data && !query.isError && <MaterialPlanResults plan={query.data} />}
          {productionMode && !!productId && (
            <ProductionPlanner selection={planningSelection} onPlan={(next) => setParams(next, { replace: true })} />
          )}
          {optimizationMode && !!products.data?.length && <ProductionOptimizer products={products.data} />}
        </main>
      </div>
    </div>
  );
}
