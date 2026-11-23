import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api';
import { bomCatalogKey, type BomCatalogSummary } from '@/lib/materialPlanning';

const header = 'product_id,product_name,material_id,material_name,qty';

export function BomCatalogImport({ configured }: { configured: boolean }) {
  const { t } = useTranslation('bom');
  const queryClient = useQueryClient();
  const upload = useMutation({
    mutationFn: async (file: File) => apiFetch<BomCatalogSummary>('/inventory/bom-catalog', {
      method: 'PUT',
      body: JSON.stringify({ csv: await file.text() }),
    }),
    onSuccess: async (catalog) => {
      await queryClient.cancelQueries({ queryKey: bomCatalogKey });
      queryClient.setQueryData(bomCatalogKey, catalog);
      await Promise.all(
        ['raw-material-balances', 'material-plan', 'production-plan'].map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] })),
      );
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get('catalog');
    if (file instanceof File && file.size) upload.mutate(file, { onSuccess: () => form.reset() });
  }

  return (
    <Card hoverLift={false} className="p-0">
      <CardHeader className="p-4 sm:p-6">
        <h2 className="text-lg font-semibold">{t('catalog.title')}</h2>
        <CardDescription>{t('catalog.description')}</CardDescription>
        <p className="break-all text-xs text-muted-foreground"><code dir="ltr">{header}</code></p>
      </CardHeader>
      <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
        <form className="space-y-3" aria-busy={upload.isPending} onSubmit={submit}>
          <Label htmlFor="bom-catalog-file">{t('catalog.file')}</Label>
          <Input id="bom-catalog-file" name="catalog" type="file" accept=".csv,text/csv" required
            disabled={upload.isPending} onChange={upload.reset} />
          <Button type="submit" size="sm" disabled={upload.isPending}>
            {t(upload.isPending ? 'catalog.saving' : configured ? 'catalog.replace' : 'catalog.import')}
          </Button>
          {upload.isError && <p role="alert" className="text-sm text-destructive">{t('catalog.error')} {upload.error.message}</p>}
          {upload.isSuccess && <p role="status" className="text-sm text-muted-foreground">{t('catalog.saved')}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
