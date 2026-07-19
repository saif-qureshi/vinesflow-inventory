"use client";

import type { ItemStock, Warehouse } from "@/types";

const num = (s?: string) => {
  const n = Number(s ?? 0);
  return Number.isNaN(n) ? "0" : String(n);
};

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 p-3">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}

export function StockOverview({
  stock,
  uom,
  reorderPoint,
  warehouses,
}: {
  stock?: ItemStock;
  uom: string;
  reorderPoint: number | null;
  warehouses: Warehouse[];
}) {
  const whName = (id: number) => warehouses.find((w) => w.id === id)?.name ?? `#${id}`;

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs text-gray-400">Stock on hand</div>
        <div className="text-2xl font-semibold tabular-nums">
          {num(stock?.on_hand)} <span className="text-base font-normal text-gray-400">{uom}</span>
        </div>
      </div>

      <div className="space-y-1 border-t border-gray-100 pt-3">
        <Line label="Opening stock" value={num(stock?.opening_stock)} />
        <Line label="Committed" value={num(stock?.committed)} />
        <Line label="Available for sale" value={num(stock?.available)} />
        <Line label="Reorder point" value={reorderPoint != null ? String(reorderPoint) : "—"} />
      </div>

      {stock && stock.by_location.length > 0 && (
        <div className="space-y-1 border-t border-gray-100 pt-3">
          <div className="text-xs text-gray-400">By warehouse</div>
          {stock.by_location.map((b) => (
            <div key={b.location_id} className="flex justify-between text-sm">
              <span className="text-gray-600">{whName(b.location_id)}</span>
              <span className="tabular-nums">{num(b.quantity)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
        <Tile label="To be shipped" value={num(stock?.to_be_shipped)} />
        <Tile label="To be received" value={num(stock?.to_be_received)} />
        <Tile label="To be invoiced" value={num(stock?.to_be_invoiced)} />
        <Tile label="To be billed" value={num(stock?.to_be_billed)} />
      </div>
    </div>
  );
}
