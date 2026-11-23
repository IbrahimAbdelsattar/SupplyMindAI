import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api';
import { bomCatalogKey, type BomCatalogSummary } from '@/lib/materialPlanning';

const headerStandard = 'product_id,material_id,qty';
const headerDetailed = 'product_id,product_name,material_id,material_name,qty';

export function BomCatalogImport({ configured }: { configured: boolean }) {
  const { t } = useTranslation('bom');
  const queryClient = useQueryClient();

  const handleSuccess = async (catalog: BomCatalogSummary) => {
    await queryClient.cancelQueries({ queryKey: bomCatalogKey });
    queryClient.setQueryData(bomCatalogKey, catalog);
    await Promise.all(
      ['raw-material-balances', 'material-plan', 'production-plan'].map((key) =>
        queryClient.invalidateQueries({ queryKey: [key] })),
    );
  };

  const upload = useMutation({
    mutationFn: async (file: File) => apiFetch<BomCatalogSummary>('/inventory/bom-catalog', {
      method: 'PUT',
      body: JSON.stringify({ csv: await file.text() }),
    }),
    onSuccess: handleSuccess,
  });

  const loadDefault = useMutation({
    mutationFn: async () => apiFetch<BomCatalogSummary>('/inventory/bom-catalog/load-default', {
      method: 'POST',
    }),
    onSuccess: handleSuccess,
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get('catalog');
    if (file instanceof File && file.size) upload.mutate(file, { onSuccess: () => form.reset() });
  }

  const isBusy = upload.isPending || loadDefault.isPending;

  return (
    <Card hoverLift={false} className="p-0">
      <CardHeader className="p-4 sm:p-6">
        <h2 className="text-lg font-semibold">{t('catalog.title')}</h2>
        <CardDescription>{t('catalog.description')}</CardDescription>
        <p className="break-all text-xs text-muted-foreground">
          {t('catalog.supportedFormats')}: <code dir="ltr">{headerStandard}</code> ({t('catalog.standard')}) {t('catalog.or')} <code dir="ltr">{headerDetailed}</code>
        </p>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">{t('catalog.defaultSystemTitle')}</p>
            <p className="text-xs text-muted-foreground">{t('catalog.defaultSystemDescription')}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isBusy}
            onClick={() => loadDefault.mutate()}
          >
            {t(loadDefault.isPending ? 'catalog.loadingDefault' : 'catalog.loadDefault')}
          </Button>
        </div>

        <form className="space-y-3" aria-busy={isBusy} onSubmit={submit}>
          <Label htmlFor="bom-catalog-file">{t('catalog.file')}</Label>
          <Input id="bom-catalog-file" name="catalog" type="file" accept=".csv,text/csv" required
            disabled={isBusy} onChange={() => { upload.reset(); loadDefault.reset(); }} />
          <Button type="submit" size="sm" disabled={isBusy}>
            {t(upload.isPending ? 'catalog.saving' : configured ? 'catalog.replace' : 'catalog.import')}
          </Button>
          {(upload.isError || loadDefault.isError) && (
            <p role="alert" className="text-sm text-destructive">
              {t('catalog.error')} {(upload.error || loadDefault.error)?.message}
            </p>
          )}
          {(upload.isSuccess || loadDefault.isSuccess) && (
            <p role="status" className="text-sm text-muted-foreground">{t('catalog.saved')}</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
