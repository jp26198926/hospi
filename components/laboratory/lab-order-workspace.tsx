"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { ResultEntryForm } from "./result-entry-form";

interface LabOrderDetail {
  id: string;
  orderNumber: string;
  patientId: string;
  encounterId: string;
  priority: string;
  status: string;
  clinicalNotes: string | null;
  createdAt: string;
  patientFirstName: string | null;
  patientLastName: string | null;
  patientMrn: string | null;
  labOrderId: string;
  panelId: string | null;
  notes: string | null;
  tests: Array<{
    id: string;
    testId: string;
    testCode: string;
    testName: string;
    testUnit: string | null;
    referenceRangeLow: number | null;
    referenceRangeHigh: number | null;
    referenceRangeText: string | null;
  }>;
  specimens: Array<{
    id: string;
    accessionNumber: string;
    specimenTypeId: string | null;
    collectedAt: string | null;
    status: string;
    notes: string | null;
    rejectedReason: string | null;
    typeName: string | null;
  }>;
  results: Array<{
    id: string;
    specimenId: string | null;
    testId: string;
    value: string;
    unit: string | null;
    referenceRangeLow: number | null;
    referenceRangeHigh: number | null;
    isAbnormal: boolean;
    abnormalFlag: string | null;
    status: string;
    testCode: string;
    testName: string;
    enteredAt: string | null;
    validatedAt: string | null;
    releasedAt: string | null;
  }>;
}

interface SpecimenType {
  id: string;
  name: string;
  code: string;
}

const priorityVariant: Record<string, "default" | "warning" | "destructive"> = {
  normal: "default",
  urgent: "warning",
  emergency: "destructive",
};

interface LabOrderWorkspaceProps {
  orderId: string;
}

export function LabOrderWorkspace({ orderId }: LabOrderWorkspaceProps) {
  const router = useRouter();
  const [order, setOrder] = useState<LabOrderDetail | null>(null);
  const [specimenTypes, setSpecimenTypes] = useState<SpecimenType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Specimen collect form
  const [specimenTypeId, setSpecimenTypeId] = useState("");
  const [specimenNotes, setSpecimenNotes] = useState("");

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/laboratory/orders/${orderId}`);
      const json = await res.json();
      if (json.success) {
        setOrder(json.data);
        setError(null);
      } else {
        setError(json.error?.message || "Failed to load lab order");
      }
    } catch {
      setError("Failed to load lab order");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/laboratory/orders/${orderId}`);
        const json = await res.json();
        if (!cancelled) {
          if (json.success) {
            setOrder(json.data);
            setError(null);
          } else {
            setError(json.error?.message || "Failed to load lab order");
          }
        }
      } catch {
        if (!cancelled) setError("Failed to load lab order");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  useEffect(() => {
    let cancelled = false;
    async function loadTypes() {
      try {
        const res = await fetch("/api/laboratory/specimen-types");
        const json = await res.json();
        if (!cancelled && json.success) {
          setSpecimenTypes(json.data ?? []);
        }
      } catch {
        // ignore
      }
    }
    loadTypes();
    return () => {
      cancelled = true;
    };
  }, []);

  async function collectSpecimen() {
    setActionError(null);
    setActionLoading("collect");
    try {
      const res = await fetch(`/api/laboratory/orders/${orderId}/specimen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          specimenTypeId: specimenTypeId || undefined,
          notes: specimenNotes || null,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setActionError(json.error?.message || "Failed to collect specimen");
        return;
      }
      setSpecimenTypeId("");
      setSpecimenNotes("");
      await fetchOrder();
      router.refresh();
    } catch {
      setActionError("Failed to collect specimen");
    } finally {
      setActionLoading(null);
    }
  }

  async function markProcessing(specimenId: string) {
    setActionError(null);
    setActionLoading(specimenId);
    try {
      const res = await fetch(`/api/laboratory/orders/${orderId}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specimenId }),
      });
      const json = await res.json();
      if (!json.success) {
        setActionError(json.error?.message || "Failed to mark processing");
        return;
      }
      await fetchOrder();
    } catch {
      setActionError("Failed to mark processing");
    } finally {
      setActionLoading(null);
    }
  }

  async function validateResult(resultId: string) {
    setActionError(null);
    setActionLoading(resultId);
    try {
      const res = await fetch(`/api/laboratory/results/${resultId}/validate`, {
        method: "POST",
      });
      const json = await res.json();
      if (!json.success) {
        setActionError(json.error?.message || "Failed to validate result");
        return;
      }
      await fetchOrder();
    } catch {
      setActionError("Failed to validate result");
    } finally {
      setActionLoading(null);
    }
  }

  async function releaseResult(resultId: string) {
    setActionError(null);
    setActionLoading(resultId);
    try {
      const res = await fetch(`/api/laboratory/results/${resultId}/release`, {
        method: "POST",
      });
      const json = await res.json();
      if (!json.success) {
        setActionError(json.error?.message || "Failed to release result");
        return;
      }
      await fetchOrder();
      router.refresh();
    } catch {
      setActionError("Failed to release result");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Loading lab order…</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <Alert variant="error">
        <AlertDescription>{error ?? "Lab order not found"}</AlertDescription>
      </Alert>
    );
  }

  const patientName = `${order.patientFirstName ?? ""} ${order.patientLastName ?? ""}`.trim();
  const latestSpecimen = order.specimens[0];
  const canCollect =
    order.status !== "cancelled" &&
    order.status !== "rejected" &&
    order.status !== "completed";
  const enteredResults = order.results.filter((r) => r.status === "entered");
  const validatedResults = order.results.filter((r) => r.status === "validated");

  return (
    <div className="space-y-6">
      {actionError && (
        <Alert variant="error">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {/* Patient / Order Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">{patientName}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-mono">{order.patientMrn}</span>
                {" · "}
                <span className="font-mono">{order.orderNumber}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={priorityVariant[order.priority] ?? "default"}>
                {order.priority}
              </Badge>
              <StatusBadge status={order.status} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {order.clinicalNotes && (
            <p className="text-sm">
              <span className="text-muted-foreground">Clinical Notes: </span>
              {order.clinicalNotes}
            </p>
          )}
          {order.notes && (
            <p className="mt-1 text-sm">
              <span className="text-muted-foreground">Lab Notes: </span>
              {order.notes}
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Ordered {new Date(order.createdAt).toLocaleString()}
          </p>
        </CardContent>
      </Card>

      {/* Ordered Tests */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ordered Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Reference Range</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.tests.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.testCode}</TableCell>
                    <TableCell className="font-medium">{t.testName}</TableCell>
                    <TableCell>{t.testUnit ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {t.referenceRangeLow != null && t.referenceRangeHigh != null
                        ? `${t.referenceRangeLow} – ${t.referenceRangeHigh}`
                        : t.referenceRangeText ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="space-y-2 md:hidden">
            {order.tests.map((t) => (
              <div key={t.id} className="rounded-md border p-3">
                <p className="font-mono text-xs text-muted-foreground">{t.testCode}</p>
                <p className="font-medium">{t.testName}</p>
                <p className="text-xs text-muted-foreground">
                  {t.testUnit ? `Unit: ${t.testUnit} · ` : ""}
                  Range:{" "}
                  {t.referenceRangeLow != null && t.referenceRangeHigh != null
                    ? `${t.referenceRangeLow} – ${t.referenceRangeHigh}`
                    : t.referenceRangeText ?? "—"}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Specimen Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Specimen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {order.specimens.length > 0 && (
            <div className="space-y-2">
              {order.specimens.map((spec) => (
                <div
                  key={spec.id}
                  className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-mono text-sm font-medium">{spec.accessionNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {spec.typeName ?? "Unspecified type"}
                      {spec.collectedAt &&
                        ` · Collected ${new Date(spec.collectedAt).toLocaleString()}`}
                    </p>
                    {spec.rejectedReason && (
                      <p className="mt-1 text-xs text-destructive">
                        Rejected: {spec.rejectedReason}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={spec.status} />
                    {spec.status === "collected" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => markProcessing(spec.id)}
                        loading={actionLoading === spec.id}
                      >
                        Mark Processing
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {canCollect && (
            <div className="space-y-3 rounded-md border p-3">
              <p className="text-sm font-medium">Collect Specimen</p>
              <FormField label="Specimen Type" htmlFor="specimenTypeId">
                <Select
                  id="specimenTypeId"
                  value={specimenTypeId}
                  onChange={(e) => setSpecimenTypeId(e.target.value)}
                >
                  <option value="">Unspecified</option>
                  {specimenTypes.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.code} — {st.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Notes" htmlFor="specimenNotes">
                <Textarea
                  id="specimenNotes"
                  value={specimenNotes}
                  onChange={(e) => setSpecimenNotes(e.target.value)}
                  rows={2}
                />
              </FormField>
              <Button
                size="sm"
                onClick={collectSpecimen}
                loading={actionLoading === "collect"}
              >
                Collect Specimen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {order.results.length > 0 && (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Range</TableHead>
                      <TableHead>Flag</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.results.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <span className="font-mono text-xs text-muted-foreground">
                            {r.testCode}
                          </span>
                          <p className="font-medium">{r.testName}</p>
                        </TableCell>
                        <TableCell>
                          {r.value} {r.unit && <span className="text-xs text-muted-foreground">{r.unit}</span>}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.referenceRangeLow != null && r.referenceRangeHigh != null
                            ? `${r.referenceRangeLow} – ${r.referenceRangeHigh}`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {r.abnormalFlag && (
                            <Badge variant={r.abnormalFlag === "H" ? "destructive" : "warning"}>
                              {r.abnormalFlag}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={r.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {r.status === "entered" && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => validateResult(r.id)}
                                loading={actionLoading === r.id}
                              >
                                Validate
                              </Button>
                            )}
                            {r.status === "validated" && (
                              <Button
                                size="sm"
                                onClick={() => releaseResult(r.id)}
                                loading={actionLoading === r.id}
                              >
                                Release
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-2 md:hidden">
                {order.results.map((r) => (
                  <div key={r.id} className="rounded-md border p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">{r.testCode}</p>
                        <p className="font-medium">{r.testName}</p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="mt-2 text-sm">
                      {r.value} {r.unit}
                      {r.abnormalFlag && (
                        <Badge
                          className="ml-2"
                          variant={r.abnormalFlag === "H" ? "destructive" : "warning"}
                        >
                          {r.abnormalFlag}
                        </Badge>
                      )}
                    </p>
                    <div className="mt-2 flex gap-2">
                      {r.status === "entered" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => validateResult(r.id)}
                          loading={actionLoading === r.id}
                        >
                          Validate
                        </Button>
                      )}
                      {r.status === "validated" && (
                        <Button
                          size="sm"
                          onClick={() => releaseResult(r.id)}
                          loading={actionLoading === r.id}
                        >
                          Release
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {(enteredResults.length > 0 || validatedResults.length > 0) && (
            <p className="text-xs text-muted-foreground">
              {enteredResults.length} entered · {validatedResults.length} validated awaiting release
            </p>
          )}

          {order.status !== "cancelled" &&
            order.status !== "rejected" &&
            order.status !== "completed" &&
            order.tests.length > 0 && (
              <div className="border-t pt-4">
                <p className="mb-3 text-sm font-medium">Enter New Results</p>
                <ResultEntryForm
                  labOrderId={orderId}
                  tests={order.tests}
                  specimenId={latestSpecimen?.id}
                  onSaved={fetchOrder}
                />
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
