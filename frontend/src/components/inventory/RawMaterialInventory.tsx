import { useId, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { Boxes } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, type To } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api';
import type { MaterialSupplierQuote, RawMaterialBalance, RawMaterialInventoryEntry } from '@/lib/materialPlanning';

const balancesKey = ['raw-material-balances'];

function invalidateMaterialQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: balancesKey });
  void queryClient.invalidateQueries({ queryKey: ['material-plan'] });
  void queryClient.invalidateQueries({ queryKey: ['production-plan'] });
}

export function RawMaterialInventory({ canEdit, planLink, planningView = false }: {
  canEdit: boolean;
  planLink?: To;
  planningView?: boolean;
}) {
  const { t, i18n } = useTranslation('bom');
  const balances = useQuery({
    queryKey: balancesKey,
    queryFn: ({ signal }) => apiFetch<RawMaterialInventoryEntry[]>('/inventory/raw-materials', { signal }),
  });
  const numbers = new Intl.NumberFormat(i18n.language);
  const dates = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' });
  const prices = new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'EGP' });

  return (
    <Card hoverLift={false} className="p-0" id={planningView ? 'current-materials' : undefined}
      tabIndex={planningView ? -1 : undefined}>
      <CardHeader className="flex flex-col gap-3 space-y-0 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{t(planningView ? 'currentMaterials' : 'rawMaterials')}</h2>
          <CardDescription>{t(planningView ? 'currentMaterialsDescription' : 'rawMaterialsDescription')}</CardDescription>
        </div>
        {planLink && (
          <Button asChild variant="outline" size="sm" className="self-start sm:self-auto">
            <Link to={planLink}><Boxes aria-hidden="true" />{t('planLink')}</Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
        {balances.isPending && <p role="status" className="text-sm text-muted-foreground">{t('loadingBalances')}</p>}
        {balances.isError && (
          <div className="flex flex-wrap items-center gap-3">
            <p role="alert" className="text-sm text-destructive">{t('balancesError')}</p>
            <Button variant="outline" size="sm" onClick={() => void balances.refetch()}>{t('retry')}</Button>
          </div>
        )}
        {balances.data?.length === 0 && <p className="text-sm text-muted-foreground">{t('noMaterials')}</p>}
        {!!balances.data?.length && (
          <ul className="divide-y divide-border/70 rounded-xl border border-border/70">
            {balances.data.map((material) => (
              <li key={material.material_id} className="grid items-center gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
                <div>
                  <h3 className="font-medium">{material.material_name}</h3>
                  <p className="text-xs text-muted-foreground"><bdi>{material.material_id}</bdi></p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {material.quote
                      ? <><bdi>{material.quote.supplier_name}</bdi> · {prices.format(Number(material.quote.unit_price))} · {t('leadDays', { days: numbers.format(material.quote.lead_time_days) })}</>
                      : t('noSupplierQuote')}
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">{t('onHand')}</dt>
                    <dd className="mt-0.5 font-medium tabular-nums">
                      {material.on_hand === null ? t('unknown') : numbers.format(material.on_hand)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">{t('updatedAt')}</dt>
                    <dd className="mt-0.5">
                      {material.updated_at ? <time dateTime={material.updated_at}>{dates.format(new Date(material.updated_at))}</time> : '—'}
                    </dd>
                  </div>
                </dl>
                {canEdit && (
                  <div className="flex flex-wrap gap-2">
                    <RawMaterialStockEditor material={material} />
                    <RawMaterialQuoteEditor material={material} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RawMaterialStockEditor({ material }: { material: RawMaterialBalance }) {
  const { t } = useTranslation('bom');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState('');
  const mutation = useMutation({
    mutationFn: (onHand: number) => apiFetch<RawMaterialBalance>(
      `/inventory/raw-materials/${encodeURIComponent(material.material_id)}`,
      { method: 'PUT', body: JSON.stringify({ on_hand: onHand }) },
    ),
    onSuccess: () => {
      invalidateMaterialQueries(queryClient);
      toast({ title: t('saved') });
      setOpen(false);
    },
  });
  const action = t(material.on_hand === null ? 'record' : 'update');

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (mutation.isPending) return;
      if (nextOpen) {
        setCount(material.on_hand === null ? '' : String(material.on_hand));
        mutation.reset();
      }
      setOpen(nextOpen);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="justify-self-start">
          {action}<span className="sr-only"> · {material.material_name}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader className="text-start">
          <DialogTitle>{t('editCount', { material: material.material_name })}</DialogTitle>
          <DialogDescription>{t('editDescription')}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(Number(count));
        }}>
          <div className="space-y-2">
            <Label htmlFor={inputId}>{t('onHand')}</Label>
            <Input
              id={inputId}
              type="number"
              inputMode="numeric"
              min={0}
              max={2_147_483_647}
              step={1}
              required
              disabled={mutation.isPending}
              value={count}
              onChange={(event) => setCount(event.target.value)}
            />
          </div>
          {mutation.isError && <p role="alert" className="text-sm text-destructive">{t('saveError')}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => setOpen(false)}>{t('cancel')}</Button>
            <Button type="submit" disabled={mutation.isPending}>{t(mutation.isPending ? 'saving' : 'save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RawMaterialQuoteEditor({ material }: { material: RawMaterialInventoryEntry }) {
  const { t } = useTranslation('bom');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const { quote } = material;
  const mutation = useMutation({
    mutationFn: (payload: MaterialSupplierQuote) => apiFetch<MaterialSupplierQuote>(
      `/inventory/raw-materials/${encodeURIComponent(material.material_id)}/quote`,
      { method: 'PUT', body: JSON.stringify(payload) },
    ),
    onSuccess: () => {
      invalidateMaterialQueries(queryClient);
      toast({ title: t('quoteSaved') });
      setOpen(false);
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    mutation.mutate({
      supplier_name: String(form.get('supplier')).trim(),
      unit_price: String(form.get('price')),
      lead_time_days: Number(form.get('lead')),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (mutation.isPending) return;
      if (next) mutation.reset();
      setOpen(next);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {t(quote ? 'updateQuote' : 'recordQuote')}<span className="sr-only"> · {material.material_name}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader className="text-start">
          <DialogTitle>{t('quoteForMaterial', { material: material.material_name })}</DialogTitle>
          <DialogDescription>{t('quoteDescription')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${inputId}-supplier`}>{t('supplierName')}</Label>
            <Input id={`${inputId}-supplier`} name="supplier" required maxLength={120} pattern=".*\S.*"
              disabled={mutation.isPending} defaultValue={quote?.supplier_name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${inputId}-price`}>{t('quoteUnitPrice')}</Label>
            <Input id={`${inputId}-price`} name="price" type="number" inputMode="decimal"
              required min={0} max={9999999999.99} step="0.01" disabled={mutation.isPending} defaultValue={quote?.unit_price} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${inputId}-lead`}>{t('quoteLeadDays')}</Label>
            <Input id={`${inputId}-lead`} name="lead" type="number" inputMode="numeric"
              required min={0} max={2_147_483_647} step={1} disabled={mutation.isPending} defaultValue={quote?.lead_time_days} />
          </div>
          {mutation.isError && <p role="alert" className="text-sm text-destructive">{t('quoteSaveError')}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => setOpen(false)}>{t('cancel')}</Button>
            <Button type="submit" disabled={mutation.isPending}>{t(mutation.isPending ? 'saving' : 'saveQuote')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
