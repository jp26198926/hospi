"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

interface Medication {
  id: string;
  genericName: string;
  brandName: string | null;
  dosageForm: string;
  strength: string;
  unit: string | null;
  sellingPrice: number;
}

interface CartItem {
  medicationId: string;
  genericName: string;
  strength: string;
  dosageForm: string;
  sellingPrice: number;
  quantity: number;
}

export function WalkInSaleForm() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [medications, setMedications] = useState<Medication[]>([]);
  const [searching, setSearching] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setSearching(true);
      try {
        const params = new URLSearchParams({ active: "true", limit: "20" });
        if (search) params.set("search", search);
        const res = await fetch(`/api/pharmacy/medications?${params.toString()}`);
        const json = await res.json();
        if (!cancelled && json.success) {
          setMedications(json.data.items ?? []);
        }
      } catch {
        if (!cancelled) setMedications([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [search]);

  function addToCart(med: Medication) {
    setCart((prev) => {
      const existing = prev.find((c) => c.medicationId === med.id);
      if (existing) {
        return prev.map((c) =>
          c.medicationId === med.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          medicationId: med.id,
          genericName: med.genericName,
          strength: med.strength,
          dosageForm: med.dosageForm,
          sellingPrice: med.sellingPrice,
          quantity: 1,
        },
      ];
    });
  }

  function updateQuantity(medicationId: string, quantity: number) {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((c) => c.medicationId !== medicationId));
      return;
    }
    setCart((prev) =>
      prev.map((c) => (c.medicationId === medicationId ? { ...c, quantity } : c))
    );
  }

  function removeFromCart(medicationId: string) {
    setCart((prev) => prev.filter((c) => c.medicationId !== medicationId));
  }

  const total = cart.reduce((sum, c) => sum + c.quantity * c.sellingPrice, 0);

  async function completeSale() {
    setError(null);
    setSuccess(null);

    if (cart.length === 0) {
      setError("Add at least one item to the cart.");
      return;
    }

    setCompleting(true);
    try {
      const res = await fetch("/api/pharmacy/dispensings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: notes || "Walk-in sale",
          items: cart.map((c) => ({
            medicationId: c.medicationId,
            quantity: c.quantity,
            unitPrice: c.sellingPrice,
          })),
        }),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error?.message || "Failed to complete sale");
        return;
      }

      setSuccess(`Sale completed. Total: $${total.toFixed(2)}`);
      setCart([]);
      setNotes("");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setCompleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert variant="success">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Find Medication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchInput
            placeholder="Search by generic or brand name…"
            value={search}
            onChange={setSearch}
          />

          {searching ? (
            <p className="text-sm text-muted-foreground">Searching…</p>
          ) : medications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No medications found.</p>
          ) : (
            <div className="space-y-2">
              {medications.map((med) => (
                <div
                  key={med.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{med.genericName}</p>
                    <p className="text-xs text-muted-foreground">
                      {med.strength} {med.dosageForm}
                      {med.brandName ? ` · ${med.brandName}` : ""}
                    </p>
                  </div>
                  <div className="ml-3 flex items-center gap-3">
                    <span className="text-sm font-medium">
                      ${med.sellingPrice.toFixed(2)}
                    </span>
                    <Button size="sm" variant="secondary" onClick={() => addToCart(med)}>
                      Add
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Cart</CardTitle>
            {cart.length > 0 && (
              <Badge variant="info">
                {cart.reduce((sum, c) => sum + c.quantity, 0)} item
                {cart.reduce((sum, c) => sum + c.quantity, 0) !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {cart.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Cart is empty. Search and add medications above.
            </p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medication</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Subtotal</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((item) => (
                      <TableRow key={item.medicationId}>
                        <TableCell>
                          <p className="font-medium">{item.genericName}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.strength} {item.dosageForm}
                          </p>
                        </TableCell>
                        <TableCell>${item.sellingPrice.toFixed(2)}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) =>
                              updateQuantity(
                                item.medicationId,
                                parseInt(e.target.value, 10) || 1
                              )
                            }
                            className="w-20"
                            aria-label={`Quantity for ${item.genericName}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          ${(item.quantity * item.sellingPrice).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFromCart(item.medicationId)}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-2 md:hidden">
                {cart.map((item) => (
                  <div
                    key={item.medicationId}
                    className="rounded-md border p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{item.genericName}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.strength} {item.dosageForm}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFromCart(item.medicationId)}
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuantity(
                            item.medicationId,
                            parseInt(e.target.value, 10) || 1
                          )
                        }
                        className="w-20"
                        aria-label={`Quantity for ${item.genericName}`}
                      />
                      <span className="text-sm">
                        ${item.sellingPrice.toFixed(2)} each
                      </span>
                      <span className="ml-auto font-medium">
                        ${(item.quantity * item.sellingPrice).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <FormField label="Notes" htmlFor="saleNotes">
                <Textarea
                  id="saleNotes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional sale notes…"
                  rows={2}
                />
              </FormField>

              <div className="flex items-center justify-between border-t pt-3">
                <div>
                  <span className="text-sm font-medium">Total</span>
                  <p className="text-2xl font-bold">${total.toFixed(2)}</p>
                </div>
                <Button onClick={completeSale} loading={completing}>
                  Complete Sale
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
