import { useMemo, useState } from "react";
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
    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort(field)}>
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
        <h1 className="text-xl font-bold text-foreground">Inventory</h1>
        <div className="relative ml-auto w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search SKU, product, category..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="max-h-[calc(100vh-10rem)] overflow-auto rounded-lg border bg-card">
        <Table className="w-full min-w-[1100px]">
          <TableHeader>
            <TableRow className="whitespace-nowrap">
              <SortHeader field="sku">SKU</SortHeader>
              <SortHeader field="name">Product Name</SortHeader>
              <SortHeader field="category">Category</SortHeader>
              <SortHeader field="productType">Type</SortHeader>
              <SortHeader field="stock">Stock Level</SortHeader>
              <SortHeader field="averageDailyDemand">Avg Daily Demand</SortHeader>
              <TableHead>Coverage</TableHead>
              <SortHeader field="stockStatus">Status</SortHeader>
              <TableHead>Active</TableHead>
              <SortHeader field="lastUpdated">Snapshot Date</SortHeader>
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
                <TableCell>{item.stock.toLocaleString()} units</TableCell>
                <TableCell>{item.averageDailyDemand.toFixed(2)} units</TableCell>
                <TableCell className="max-w-[220px] text-sm text-muted-foreground">
                  {item.coverageDays !== null ? `${item.coverageDays.toFixed(2)} days` : item.coverageLabel}
                </TableCell>
                <TableCell>
                  <Badge className={statusStyles[item.stockStatus] ?? "bg-secondary text-secondary-foreground"}>
                    {item.stockStatus}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={item.active ? "default" : "outline"}>
                    {item.active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{item.lastUpdated}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                  No items match your search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
