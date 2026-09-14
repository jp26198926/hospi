"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";

interface Order {
  id: string;
  orderNumber: string;
  type: string;
  priority: string;
  status: string;
  createdAt: string | Date;
  patientFirstName: string | null;
  patientLastName: string | null;
  patientMrn: string | null;
}

interface OrderListProps {
  initialOrders?: Order[];
}

const typeVariant: Record<string, "default" | "info" | "warning"> = {
  laboratory: "info",
  radiology: "warning",
  medication: "default",
};

const priorityVariant: Record<string, "default" | "warning" | "destructive"> = {
  normal: "default",
  urgent: "warning",
  emergency: "destructive",
};

const TYPE_TABS = [
  { value: "", label: "All" },
  { value: "laboratory", label: "Lab" },
  { value: "radiology", label: "Rad" },
  { value: "medication", label: "Med" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "ordered", label: "Ordered" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "rejected", label: "Rejected" },
];

export function OrderList({ initialOrders }: OrderListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get("type") ?? "";
  const status = searchParams.get("status") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1", 10) || 1;

  const [orders, setOrders] = useState<Order[]>(initialOrders ?? []);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(!initialOrders);
  const [error, setError] = useState<string | null>(null);

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      if ("type" in updates || "status" in updates) {
        params.delete("page");
      }
      router.push(`/orders?${params.toString()}`);
    },
    [router, searchParams]
  );

  useEffect(() => {
    if (initialOrders && !type && !status && page <= 1) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (type) params.set("type", type);
        if (status) params.set("status", status);
        params.set("page", String(page));
        params.set("limit", "20");
        const res = await fetch(`/api/orders?${params.toString()}`);
        const json = await res.json();
        if (!cancelled) {
          if (json.success) {
            setOrders(json.data.items ?? []);
            setTotalPages(json.data.totalPages ?? 1);
            setError(null);
          } else {
            setError(json.error?.message || "Failed to load orders");
          }
        }
      } catch {
        if (!cancelled) setError("Failed to load orders");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [type, status, page]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      {/* Type tabs */}
      <div className="flex flex-wrap gap-2">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => updateParams({ type: tab.value })}
            className={`inline-flex h-9 items-center rounded-md px-3 text-sm font-medium transition-colors ${
              type === tab.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div className="w-full sm:w-48">
        <Select
          value={status}
          onChange={(e) => updateParams({ status: e.target.value })}
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <p className="text-sm text-muted-foreground">Loading orders…</p>
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          title="No orders found"
          description={
            type || status
              ? "Try adjusting your filters."
              : "Create your first order to get started."
          }
          action={
            <Link
              href="/orders/new"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              New Order
            </Link>
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link
                        href={
                          order.type === "laboratory"
                            ? `/laboratory/orders/${order.id}`
                            : order.type === "radiology"
                              ? `/radiology/orders/${order.id}`
                              : `/orders`
                        }
                        className="font-mono text-xs font-medium hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={typeVariant[order.type] ?? "default"}>
                        {order.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {order.patientFirstName} {order.patientLastName}
                      {order.patientMrn && (
                        <span className="ml-1 font-mono text-xs text-muted-foreground">
                          {order.patientMrn}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={priorityVariant[order.priority] ?? "default"}>
                        {order.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link
                        href={
                          order.type === "laboratory"
                            ? `/laboratory/orders/${order.id}`
                            : order.type === "radiology"
                              ? `/radiology/orders/${order.id}`
                              : `/orders`
                        }
                        className="font-mono text-sm font-medium hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                      <p className="mt-1 text-sm">
                        {order.patientFirstName} {order.patientLastName}
                      </p>
                      {order.patientMrn && (
                        <p className="font-mono text-xs text-muted-foreground">
                          {order.patientMrn}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={typeVariant[order.type] ?? "default"}>
                        {order.type}
                      </Badge>
                      <StatusBadge status={order.status} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t pt-2">
                    <Badge variant={priorityVariant[order.priority] ?? "default"}>
                      {order.priority}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={(p) => updateParams({ page: String(p) })}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
