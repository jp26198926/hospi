"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
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
  reorderLevel: number;
  sellingPrice: number;
  active: boolean;
}

interface PharmacyCatalogClientProps {
  initialMedications: Medication[];
}

export function PharmacyCatalogClient({ initialMedications }: PharmacyCatalogClientProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [genericName, setGenericName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [dosageForm, setDosageForm] = useState("");
  const [strength, setStrength] = useState("");
  const [unit, setUnit] = useState("");
  const [reorderLevel, setReorderLevel] = useState("0");
  const [sellingPrice, setSellingPrice] = useState("0");

  const filtered = search
    ? initialMedications.filter(
        (m) =>
          m.genericName.toLowerCase().includes(search.toLowerCase()) ||
          (m.brandName ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : initialMedications;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch("/api/pharmacy/medications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genericName,
          brandName: brandName || null,
          dosageForm,
          strength,
          unit,
          reorderLevel: Number(reorderLevel) || 0,
          sellingPrice: Number(sellingPrice) || 0,
        }),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error?.message || "Failed to create medication");
        return;
      }

      setSuccess("Medication created.");
      setGenericName("");
      setBrandName("");
      setDosageForm("");
      setStrength("");
      setUnit("");
      setReorderLevel("0");
      setSellingPrice("0");
      setShowForm(false);
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
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

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <SearchInput
            placeholder="Search medications…"
            value={search}
            onChange={setSearch}
          />
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant={showForm ? "secondary" : "primary"}>
          {showForm ? "Cancel" : "Add Medication"}
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Medication</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Generic Name *" htmlFor="genericName">
                  <Input
                    id="genericName"
                    value={genericName}
                    onChange={(e) => setGenericName(e.target.value)}
                    required
                    maxLength={200}
                  />
                </FormField>
                <FormField label="Brand Name" htmlFor="brandName">
                  <Input
                    id="brandName"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    maxLength={200}
                  />
                </FormField>
                <FormField label="Dosage Form *" htmlFor="dosageForm">
                  <Input
                    id="dosageForm"
                    value={dosageForm}
                    onChange={(e) => setDosageForm(e.target.value)}
                    required
                    maxLength={100}
                    placeholder="tablet, capsule, syrup…"
                  />
                </FormField>
                <FormField label="Strength *" htmlFor="strength">
                  <Input
                    id="strength"
                    value={strength}
                    onChange={(e) => setStrength(e.target.value)}
                    required
                    maxLength={100}
                    placeholder="500mg, 5mg/ml…"
                  />
                </FormField>
                <FormField label="Unit *" htmlFor="unit">
                  <Input
                    id="unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    required
                    maxLength={50}
                    placeholder="tablet, ml, vial…"
                  />
                </FormField>
                <FormField label="Reorder Level" htmlFor="reorderLevel">
                  <Input
                    id="reorderLevel"
                    type="number"
                    min={0}
                    value={reorderLevel}
                    onChange={(e) => setReorderLevel(e.target.value)}
                  />
                </FormField>
                <FormField label="Selling Price" htmlFor="sellingPrice">
                  <Input
                    id="sellingPrice"
                    type="number"
                    min={0}
                    step="0.01"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                  />
                </FormField>
              </div>
              <Button type="submit" loading={loading}>
                Create Medication
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Medications ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {search ? "No medications match your search." : "No medications in the catalog."}
            </p>
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Generic Name</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Form</TableHead>
                      <TableHead>Strength</TableHead>
                      <TableHead>Reorder Level</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.genericName}</TableCell>
                        <TableCell>{m.brandName ?? "—"}</TableCell>
                        <TableCell>{m.dosageForm}</TableCell>
                        <TableCell>{m.strength}</TableCell>
                        <TableCell className="font-mono">{m.reorderLevel}</TableCell>
                        <TableCell>${m.sellingPrice.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={m.active ? "success" : "default"}>
                            {m.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="space-y-2 md:hidden">
                {filtered.map((m) => (
                  <div key={m.id} className="rounded-md border p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{m.genericName}</p>
                        {m.brandName && (
                          <p className="text-xs text-muted-foreground">{m.brandName}</p>
                        )}
                      </div>
                      <Badge variant={m.active ? "success" : "default"}>
                        {m.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {m.strength} {m.dosageForm}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Reorder: {m.reorderLevel}
                      </span>
                      <span className="font-medium">${m.sellingPrice.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
