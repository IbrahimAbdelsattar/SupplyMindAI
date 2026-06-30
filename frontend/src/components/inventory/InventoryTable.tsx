import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUpDown, Package, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface InventoryItem {
  sku: string;
  name: string;
  category: string;
  productType: string;
  active: boolean;
  stock: number;
  averageDailyDemand: number;
  coverageDays: number | null;
  coverageLabel: string;
  stockStatus: string;
  lastUpdated: string;
  sourceText: string;
}

interface InventoryTableProps {
  data: InventoryItem[];
  selectedSku: string | null;
  onSelectItem: (item: InventoryItem) => void;
}

type SortField =
  | "sku"
  | "name"
  | "category"
  | "productType"
  | "stock"
  | "averageDailyDemand"
  | "stockStatus"
  | "lastUpdated";

const statusStyles: Record<string, string> = {
  Healthy: "bg-success text-success-foreground",
  Low: "bg-warning text-warning-foreground",
  Critical: "bg-destructive text-destructive-foreground",
};

export default function InventoryTable({ data, selectedSku, onSelectItem }: InventoryTableProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("sku");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const statusRank: Record<string, number> = {
      Critical: 0,
      Low: 1,
      Healthy: 2,
    };

    return data
      .filter(
        (item) =>
          item.sku.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.productType.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const av = a[sortField];
        const bv = b[sortField];
        let cmp = 0;

        if (sortField === "stockStatus") {
          cmp = (statusRank[a.stockStatus] ?? 99) - (statusRank[b.stockStatus] ?? 99);
        } else if (typeof av === "number" && typeof bv === "number") {
          cmp = av - bv;
        } else {
          cmp = String(av).localeCompare(String(bv));
        }

        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [data, search, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortField(field);
    setSortDir("asc");
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead className="cursor-pointer select-none bg-card" onClick={() => toggleSort(field)}>
      <span className="inline-flex items-center gap-1">
        {children}
        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
      </span>
    </TableHead>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Package className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold text-foreground">{t('inventory:table.title')}</h1>
        <div className="relative ml-auto rtl:mr-auto rtl:ml-0 w-64">
          <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('inventory:table.searchPlaceholder')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9 rtl:pl-3 rtl:pr-9"
          />
        </div>
      </div>

      <div className="max-h-[calc(100vh-10rem)] overflow-auto rounded-lg border bg-card">
        <Table className="w-full">
          <TableHeader className="sticky top-0 bg-card z-10 shadow-[0_1px_0_0_hsl(var(--border))]">
            <TableRow className="whitespace-nowrap bg-card">
              <SortHeader field="sku">{t('inventory:table.sku')}</SortHeader>
              <SortHeader field="name">{t('inventory:table.productName')}</SortHeader>
              <SortHeader field="category">{t('inventory:table.category')}</SortHeader>
              <SortHeader field="productType">{t('inventory:table.type')}</SortHeader>
              <SortHeader field="stock">{t('inventory:table.stockLevel')}</SortHeader>
              <SortHeader field="averageDailyDemand">{t('inventory:table.avgDailyDemand')}</SortHeader>
              <TableHead className="bg-card">{t('inventory:table.coverage')}</TableHead>
              <SortHeader field="stockStatus">{t('inventory:table.status')}</SortHeader>
              <TableHead className="bg-card">{t('inventory:table.active')}</TableHead>
              <SortHeader field="lastUpdated">{t('inventory:table.snapshotDate')}</SortHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => (
              <TableRow
                key={item.sku}
                className={`cursor-pointer transition-colors whitespace-nowrap ${
                  selectedSku === item.sku ? "bg-accent/20" : "hover:bg-muted/50"
                }`}
                onClick={() => onSelectItem(item)}
              >
                <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell>{item.productType}</TableCell>
                <TableCell>{item.stock.toLocaleString()}{t('inventory:table.units')}</TableCell>
                <TableCell>{item.averageDailyDemand.toFixed(2)}{t('inventory:table.units')}</TableCell>
                <TableCell className="max-w-[220px] text-sm text-muted-foreground">
                  {item.coverageDays !== null ? `${item.coverageDays.toFixed(2)}${t('inventory:table.days')}` : item.coverageLabel}
                </TableCell>
                <TableCell>
                  <Badge className={statusStyles[item.stockStatus] ?? "bg-secondary text-secondary-foreground"}>
                    {t(`inventory:badges.${item.stockStatus.toLowerCase()}`)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={item.active ? "default" : "outline"}>
                    {item.active ? t('inventory:badges.active') : t('inventory:badges.inactive')}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{item.lastUpdated}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                  {t('inventory:table.noResults')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
