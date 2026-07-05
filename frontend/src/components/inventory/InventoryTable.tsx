import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUpDown, Package, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { List } from "react-window";

export interface ProductItem {
  product_id: string;
  product_name: string;
  category: string;
  type: string;
  size: string;
  min_price: number;
  max_price: number;
}

interface InventoryTableProps {
  data: ProductItem[];
  selectedId: string | null;
  onSelectItem: (item: ProductItem) => void;
}

type SortField = "product_id" | "product_name" | "category" | "type" | "size" | "min_price" | "max_price";

const ROW_HEIGHT = 52;
const LIST_MAX_HEIGHT = 572;

interface RowData {
  items: ProductItem[];
  selectedId: string | null;
  onSelectItem: (item: ProductItem) => void;
}

const Row = React.memo((props: { index: number; style: React.CSSProperties } & RowData) => {
  const { index, style, items, selectedId, onSelectItem } = props;
  const item = items[index];

  if (!item) return null;

  return (
    <div
      style={style}
      className={cn(
        "flex items-center cursor-pointer transition-colors border-b border-border/50 text-sm",
        selectedId === item.product_id ? "bg-accent/20" : "hover:bg-muted/50"
      )}
      onClick={() => onSelectItem(item)}
    >
      <div className="flex-1 min-w-[90px] px-4 py-3 font-mono text-xs truncate">{item.product_id}</div>
      <div className="flex-[2] min-w-[160px] px-4 py-3 font-medium truncate">{item.product_name}</div>
      <div className="flex-1 min-w-[100px] px-4 py-3 truncate">{item.category}</div>
      <div className="flex-1 min-w-[80px] px-4 py-3 truncate">{item.type}</div>
      <div className="flex-1 min-w-[70px] px-4 py-3 truncate">{item.size}</div>
      <div className="flex-1 min-w-[90px] px-4 py-3 text-right font-mono text-xs">{item.min_price?.toFixed(2) ?? "0.00"}</div>
      <div className="flex-1 min-w-[90px] px-4 py-3 text-right font-mono text-xs">{item.max_price?.toFixed(2) ?? "0.00"}</div>
    </div>
  );
});

Row.displayName = "Row";

export default function InventoryTable({ data, selectedId, onSelectItem }: InventoryTableProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("product_id");
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
          item.product_id.toLowerCase().includes(q) ||
          item.product_name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.type.toLowerCase().includes(q) ||
          item.size.toLowerCase().includes(q)
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
    () => ({ items: filtered, selectedId, onSelectItem }),
    [filtered, selectedId, onSelectItem]
  );

  const SortHeader = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <div
      className={cn("flex-1 px-4 py-3 cursor-pointer select-none flex items-center gap-1 truncate", className)}
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
        <h1 className="text-xl font-bold text-foreground">Products</h1>
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

      <div className="overflow-x-auto rounded-lg border bg-card">
        <div style={{ minWidth: "680px" }}>
        <div style={{ height: listHeight + 48 }}>
        <div className="flex items-center border-b border-border bg-muted/50 font-medium text-sm h-12">
          <div style={{ minWidth: "90px" }} className="flex-[1]">
            <SortHeader field="product_id">ID</SortHeader>
          </div>
          <div style={{ minWidth: "160px" }} className="flex-[2]">
            <SortHeader field="product_name">Name</SortHeader>
          </div>
          <div style={{ minWidth: "100px" }} className="flex-[1]">
            <SortHeader field="category">Category</SortHeader>
          </div>
          <div style={{ minWidth: "80px" }} className="flex-[1]">
            <SortHeader field="type">Type</SortHeader>
          </div>
          <div style={{ minWidth: "70px" }} className="flex-[1]">
            <SortHeader field="size">Size</SortHeader>
          </div>
          <div style={{ minWidth: "90px" }} className="flex-[1]">
            <SortHeader field="min_price" className="justify-end">Min Price</SortHeader>
          </div>
          <div style={{ minWidth: "90px" }} className="flex-[1]">
            <SortHeader field="max_price" className="justify-end">Max Price</SortHeader>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">{t('inventory:table.noResults')}</div>
        ) : (
          <List
            style={{ height: listHeight, width: "100%" }}
            rowCount={filtered.length}
            rowHeight={ROW_HEIGHT}
            rowProps={itemData}
            overscanCount={5}
            rowComponent={Row}
          />
        )}
      </div>
        </div>
      </div>
    </div>
  );
}
