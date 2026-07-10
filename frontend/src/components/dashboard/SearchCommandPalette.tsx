import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { apiFetch } from '@/lib/api';
import {
  LayoutDashboard,
  TrendingUp,
  Package,
  Brain,
  FileText,
  Activity,
  Settings,
  Shield,
} from 'lucide-react';

type Product = { product_id: string; product_name: string };

const pages = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Forecasting', path: '/forecasting', icon: TrendingUp },
  { label: 'Inventory', path: '/inventory', icon: Package },
  { label: 'AI Insights', path: '/insights', icon: Brain },
  { label: 'Reports', path: '/reports', icon: FileText },
  { label: 'MLOps', path: '/mlops', icon: Activity },
  { label: 'Admin', path: '/admin/users', icon: Shield },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export const SearchCommandPalette = ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!open) return;
    apiFetch<Product[]>('/data/products')
      .then(setProducts)
      .catch(() => {});
  }, [open]);

  const runCommand = useCallback(
    (cmd: () => void) => {
      onOpenChange(false);
      cmd();
    },
    [onOpenChange],
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages, products..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Pages">
          {pages.map((p) => (
            <CommandItem
              key={p.path}
              onSelect={() => runCommand(() => navigate(p.path))}
            >
              <p.icon className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {p.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {products.length > 0 && (
          <CommandGroup heading="Products">
            {products.map((prod) => (
              <CommandItem
                key={prod.product_id}
                onSelect={() => runCommand(() => navigate(`/inventory?product=${prod.product_id}`))}
              >
                <Package className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                {prod.product_name}
                <span className="ml-auto text-xs text-muted-foreground">{prod.product_id}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
};
