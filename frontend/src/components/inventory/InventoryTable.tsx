import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUpDown, Package, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { List } from "react-window";
import { AutoSizer } from "react-virtualized-auto-sizer";

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

type SortField = "sku" | "name" | "category" | "productType" | "lastUpdated";

const ROW_HEIGHT = 52;
const LIST_MAX_HEIGHT = 572;

interface RowData {
  items: InventoryItem[];
  selectedSku: string | null;
  onSelectItem: (item: InventoryItem) => void;
}

const Row = React.memo(({ index, style, data }: { index: number; style: React.CSSProperties; data: RowData }) => {
  const { items, selectedSku, onSelectItem } = data;
  const item = items[index];

  if (!item) return null;

  return (
    <div
      style={style}
      className={cn(
        "flex items-center cursor-pointer transition-colors border-b border-border/50 text-sm",
        selectedSku === item.sku ? "bg-accent/20" : "hover:bg-muted/50"
      )}
      onClick={() => onSelectItem(item)}
    >
      <div className="flex-1 min-w-[100px] px-4 py-3 font-mono text-xs truncate">{item.sku}</div>
      <div className="flex-[2] min-w-[160px] px-4 py-3 font-medium truncate">{item.name}</div>
      <div className="flex-1 min-w-[100px] px-4 py-3 truncate">{item.category}</div>
      <div className="flex-1 min-w-[80px] px-4 py-3 truncate">{item.productType}</div>
      <div className="flex-1 min-w-[100px] px-4 py-3 text-muted-foreground truncate">{item.lastUpdated}</div>
    </div>
  );
});

Row.displayName = "Row";

export default function InventoryTable({ data, selectedSku, onSelectItem }: InventoryTableProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("sku");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSearch = useCallback((value: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => setSearch(value), 150);
  }, []);

  useEffect(() => () => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return data
      .filter((item) => {
        if (!q) return true;
        return (
          item.sku.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.productType.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const av = a[sortField];
        const bv = b[sortField];
        const cmp = typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [data, search, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const itemData: RowData = useMemo(
    () => ({ items: filtered, selectedSku, onSelectItem }),
    [filtered, selectedSku, onSelectItem]
  );

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <div
      className="flex-1 px-4 py-3 cursor-pointer select-none flex items-center gap-1 truncate"
      onClick={() => toggleSort(field)}
    >
      {children}
      <ArrowUpDown className="h-3 w-3 text-muted-foreground shrink-0" />
    </div>
  );

  const listHeight = Math.min(filtered.length * ROW_HEIGHT, LIST_MAX_HEIGHT);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Package className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold text-foreground">{t('inventory:table.title')}</h1>
        <span className="text-sm text-muted-foreground">{filtered.length} items</span>
        <div className="relative ml-auto rtl:mr-auto rtl:ml-0 w-64">
          <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('inventory:table.searchPlaceholder')}
            onChange={(e) => debouncedSearch(e.target.value)}
            className="pl-9 rtl:pl-3 rtl:pr-9"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden" style={{ height: listHeight + 48 }}>
        <div className="flex items-center border-b border-border bg-muted/50 font-medium text-sm h-12">
          <div style={{ minWidth: "100px" }} className="flex-[1]">
            <SortHeader field="sku">{t('inventory:table.sku')}</SortHeader>
          </div>
          <div style={{ minWidth: "160px" }} className="flex-[2]">
            <SortHeader field="name">{t('inventory:table.productName')}</SortHeader>
          </div>
          <div style={{ minWidth: "100px" }} className="flex-[1]">
            <SortHeader field="category">{t('inventory:table.category')}</SortHeader>
          </div>
          <div style={{ minWidth: "80px" }} className="flex-[1]">
            <SortHeader field="productType">{t('inventory:table.type')}</SortHeader>
          </div>
          <div style={{ minWidth: "100px" }} className="flex-[1]">
            <SortHeader field="lastUpdated">{t('inventory:table.snapshotDate')}</SortHeader>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">{t('inventory:table.noResults')}</div>
        ) : (
          <AutoSizer disableHeight>
            {({ width }: { width: number }) => (
              <List
                height={listHeight}
                itemCount={filtered.length}
                itemSize={ROW_HEIGHT}
                itemData={itemData}
                width={width}
                overscanCount={5}
              >
                {Row}
              </List>
            )}
          </AutoSizer>
        )}
      </div>
    </div>
  );
}
