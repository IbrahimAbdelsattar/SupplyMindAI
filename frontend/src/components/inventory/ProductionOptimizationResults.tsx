import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { OptimizedScenario, ProductionOptimizationResult } from '@/lib/productionOptimization';

export function ProductionOptimizationResults({ result, products }: {
  result: ProductionOptimizationResult;
  products: { product_id: string; product_name: string }[];
}) {
  const { t, i18n } = useTranslation('bom');
  const material = (id: string) => result.materials[id] ?? id;
  const product = (id: string) => products.find(({ product_id }) => product_id === id)?.product_name ?? id;
  const number = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 }).format;
  const percent = new Intl.NumberFormat(i18n.language, { style: 'percent', maximumFractionDigits: 2 }).format;
  const price = new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'EGP' }).format;

  function renderScenario(title: string, scenario: OptimizedScenario) {
    const hasPlan = scenario.spend_egp !== null;
    return (
      <Card hoverLift={false} className="min-w-0 p-0">
        <CardHeader className="p-4 sm:p-6">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{t(`solver.status.${scenario.status}`)}</p>
          {scenario.gap !== null && scenario.gap_objective && (
            <p className="text-sm text-muted-foreground">
              {t(`solver.gap.${scenario.gap_objective}`, { gap: percent(scenario.gap) })}
            </p>
          )}
        </CardHeader>
        {hasPlan && (
          <CardContent className="space-y-5 px-4 pb-4 sm:px-6 sm:pb-6">
            <dl className="grid gap-3 sm:grid-cols-3">
              {[
                [t('solver.lineHours'), number(scenario.daily_minutes / 60)],
                [t('solver.missed'), number(scenario.targets.reduce((total, target) => total + target.missed_units, 0))],
                [t('solver.spend'), price(Number(scenario.spend_egp))],
              ].map(([label, value]) => (
                <div className="neu-basin rounded-md p-3" key={label}>
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="text-lg font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            <ResultsTable title={t('solver.fulfillment')} columns={[
              t('forecasting:product'), t('solver.dueDay'), t('targetUnits'), t('solver.onTime'), t('solver.missed'),
            ]} rows={scenario.targets.map((target) => [
              product(target.product_id), number(target.due_day), number(target.units),
              number(target.units - target.missed_units), number(target.missed_units),
            ])} />
            <details open className="space-y-2">
              <summary className="cursor-pointer font-medium">{t('productionSchedule')}</summary>
              {scenario.builds.length ? (
                <ResultsTable title={t('productionSchedule')} columns={[
                  t('solver.day'), t('forecasting:product'), t('targetUnits'), t('solver.lineMinutes'),
                ]} rows={scenario.builds.map((item) => [
                  number(item.day), product(item.product_id), number(item.units), number(item.line_minutes),
                ])} />
              ) : <p className="text-sm text-muted-foreground">{t('solver.noBuilds')}</p>}
            </details>
            <details open className="space-y-2">
              <summary className="cursor-pointer font-medium">{t('solver.plannedOrders')}</summary>
              {scenario.orders.length ? (
                <ResultsTable title={t('solver.plannedOrders')} columns={[
                  t('material'), t('supplierName'), t('solver.orderDay'), t('solver.arrivalDay'),
                  t('toBuy'), t('purchaseCost'),
                ]} rows={scenario.orders.map((order) => [
                  material(order.material_id), order.supplier_name, number(order.order_day),
                  number(order.arrival_day), number(order.units), price(Number(order.cost_egp)),
                ])} />
              ) : <p className="text-sm text-muted-foreground">{t('solver.noOrders')}</p>}
            </details>
            <details className="space-y-2">
              <summary className="cursor-pointer font-medium">{t('solver.balances')}</summary>
              <ResultsTable title={t('solver.balances')} columns={[t('solver.day'), t('material'), t('remaining')]}
                rows={scenario.balances.map((item) => [
                  number(item.day), material(item.material_id), number(item.on_hand),
                ])} />
            </details>
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-4" aria-label={t('solver.results')} role="region">
      {(result.missing_stock.length > 0 || result.missing_quotes.length > 0) && (
        <Card hoverLift={false} className="space-y-2 p-4 text-sm">
          {result.missing_stock.length > 0 && (
            <div role="alert">
              <p>{t('solver.missingStock')}</p>
              <ul className="list-disc ps-5">
                {result.missing_stock.map((id) => <li key={id}>{material(id)}</li>)}
              </ul>
            </div>
          )}
          {result.missing_quotes.length > 0 && (
            <div>
              <p>{t('solver.missingQuotes')}</p>
              <ul className="list-disc ps-5">
                {result.missing_quotes.map((id) => <li key={id}>{material(id)}</li>)}
              </ul>
            </div>
          )}
        </Card>
      )}
      {result.baseline && renderScenario(t('solver.baseline'), result.baseline)}
      {result.comparison && renderScenario(t('solver.comparison'), result.comparison)}
    </div>
  );
}

function ResultsTable({ title, columns, rows }: { title: string; columns: string[]; rows: string[][] }) {
  return (
    <Table aria-label={title}>
      <TableHeader>
        <TableRow>
          {columns.map((column) => <TableHead key={column} scope="col" className="whitespace-nowrap text-start">{column}</TableHead>)}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, rowIndex) => (
          <TableRow key={rowIndex}>
            {row.map((cell, columnIndex) => <TableCell key={columnIndex} className="py-2">{cell}</TableCell>)}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
