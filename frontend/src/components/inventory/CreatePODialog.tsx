import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ShoppingCart } from 'lucide-react';

type ProductItem = {
  product_id: string;
  product_name: string;
  category?: string;
  current_stock: number;
  unit_cost: number;
  min_price?: number;
  reorder_point?: number;
};

interface CreatePODialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductItem | null;
  suggestedQuantity?: number;
}

export function CreatePODialog({
  open,
  onOpenChange,
  product,
  suggestedQuantity,
}: CreatePODialogProps) {
  const { t } = useTranslation('inventory');
  const { formatCurrency } = useCurrency();
  const { userRole } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [quantity, setQuantity] = useState<string>(
    suggestedQuantity?.toString() ?? ''
  );
  const [notes, setNotes] = useState('');

  const { mutateAsync: createPO, isPending } = useMutation({
    mutationFn: async () => {
      if (!product) throw new Error('No product selected');
      const qty = parseInt(quantity, 10);
      if (!qty || qty <= 0) throw new Error('Invalid quantity');
      return apiFetch<{ success: boolean; po_id?: string }>('/inventory/purchase-orders', {
        method: 'POST',
        body: JSON.stringify({
          product_id: product.product_id,
          quantity: qty,
          notes: notes || undefined,
        }),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products-list'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-optimize'] });
      toast({
        title: t('po.toast.success'),
        description: t('po.toast.created', { id: data?.po_id ?? '' }),
      });
      onOpenChange(false);
      setQuantity('');
      setNotes('');
    },
    onError: (error) => {
      toast({
        title: t('po.toast.error'),
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });

  const qty = parseInt(quantity, 10) || 0;
  const effectiveUnitCost = product?.unit_cost ?? product?.min_price ?? 0;
  const totalCost = product ? qty * effectiveUnitCost : 0;

  const canCreate =
    product &&
    qty > 0 &&
    (userRole === 'admin' || userRole === 'manager');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            {t('po.title')}
          </DialogTitle>
          <DialogDescription>{t('po.description')}</DialogDescription>
        </DialogHeader>

        {product && (
          <div className="space-y-4">
            <div className="rounded-lg border p-3 bg-muted/50">
              <p className="text-sm font-medium">{product.product_name}</p>
              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                <span>{t('po.currentStock')}: {product.current_stock}</span>
                <span>{t('po.unitCost')}: {formatCurrency(effectiveUnitCost)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="po-quantity">{t('po.quantity')}</Label>
              <Input
                id="po-quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={t('po.quantityPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="po-notes">{t('po.notes')}</Label>
              <Textarea
                id="po-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('po.notesPlaceholder')}
                rows={2}
              />
            </div>

            {qty > 0 && (
              <div className="rounded-lg border p-3 bg-primary/5">
                <p className="text-xs text-muted-foreground">{t('po.estimatedTotal')}</p>
                <p className="text-lg font-bold text-primary">{formatCurrency(totalCost)}</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t('po.cancel')}
          </Button>
          <Button
            onClick={() => createPO()}
            disabled={!canCreate || isPending}
          >
            {isPending ? t('po.creating') : t('po.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
