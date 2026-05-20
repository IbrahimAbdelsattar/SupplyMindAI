import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import InventoryTable from "@/components/inventory/InventoryTable";
import ChatBot from "@/components/inventory/ChatBot";
import StockChart from "@/components/inventory/StockChart";
import { type InventoryItem } from "@/data/inventory";
import { fetchInventory } from "@/lib/api";

export default function Index() {
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["inventory"],
    queryFn: fetchInventory,
  });

  const items = data?.items ?? [];

  useEffect(() => {
    if (!items.length) {
      setSelectedItem(null);
      return;
    }

    setSelectedItem((current) => {
      if (!current) return items[0];
      return items.find((item) => item.sku === current.sku) ?? items[0];
    });
  }, [items]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background px-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">Inventory</h1>
          <p className="text-sm text-muted-foreground">Loading the latest inventory snapshot...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-background px-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">Inventory</h1>
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : "Unable to load inventory data."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background lg:flex-row">
      <div className="flex flex-1 flex-col gap-4 overflow-auto p-4 lg:p-6">
        <StockChart data={items} summary={data.summary} />
        <InventoryTable
          data={items}
          selectedSku={selectedItem?.sku ?? null}
          onSelectItem={setSelectedItem}
        />
      </div>

      <div className="flex h-[350px] flex-col border-t border-border p-4 lg:h-auto lg:w-[400px] lg:border-l lg:border-t-0">
        <ChatBot focusedItem={selectedItem} />
      </div>
    </div>
  );
}
