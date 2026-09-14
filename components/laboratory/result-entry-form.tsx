"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface OrderedTest {
  testId: string;
  testCode: string;
  testName: string;
  testUnit: string | null;
  referenceRangeLow: number | null;
  referenceRangeHigh: number | null;
  referenceRangeText: string | null;
}

interface ResultEntryFormProps {
  labOrderId: string;
  tests: OrderedTest[];
  specimenId?: string;
  onSaved?: () => void;
}

interface EntryRow {
  testId: string;
  value: string;
}

function computeFlag(
  value: string,
  low: number | null,
  high: number | null
): { isAbnormal: boolean; flag: string | null } {
  const num = Number(value);
  if (value === "" || Number.isNaN(num) || (low == null && high == null)) {
    return { isAbnormal: false, flag: null };
  }
  if (low != null && num < low) return { isAbnormal: true, flag: "L" };
  if (high != null && num > high) return { isAbnormal: true, flag: "H" };
  return { isAbnormal: false, flag: null };
}

export function ResultEntryForm({ labOrderId, tests, specimenId, onSaved }: ResultEntryFormProps) {
  const [rows, setRows] = useState<EntryRow[]>(() =>
    tests.map((t) => ({ testId: t.testId, value: "" }))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function updateValue(testId: string, value: string) {
    setRows((prev) =>
      prev.map((r) => (r.testId === testId ? { ...r, value } : r))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const filled = rows.filter((r) => r.value.trim() !== "");
    if (filled.length === 0) {
      setError("Enter at least one result value.");
      return;
    }

    setLoading(true);
    try {
      const results = filled.map((r) => {
        const test = tests.find((t) => t.testId === r.testId);
        const computed = computeFlag(
          r.value,
          test?.referenceRangeLow ?? null,
          test?.referenceRangeHigh ?? null
        );
        return {
          testId: r.testId,
          value: r.value,
          unit: test?.testUnit ?? undefined,
          isAbnormal: computed.isAbnormal,
          abnormalFlag: computed.flag ?? undefined,
        };
      });

      const res = await fetch("/api/laboratory/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labOrderId,
          specimenId: specimenId || undefined,
          results,
        }),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error?.message || "Failed to enter results");
        return;
      }

      setSuccess(`Entered ${results.length} result${results.length !== 1 ? "s" : ""}.`);
      setRows(tests.map((t) => ({ testId: t.testId, value: "" })));
      onSaved?.();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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

      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            <tr className="border-b transition-colors">
              <th className="h-10 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                Test
              </th>
              <th className="h-10 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                Reference Range
              </th>
              <th className="h-10 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                Unit
              </th>
              <th className="h-10 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                Value
              </th>
              <th className="h-10 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                Flag
              </th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {tests.map((test) => {
              const row = rows.find((r) => r.testId === test.testId);
              const computed = computeFlag(
                row?.value ?? "",
                test.referenceRangeLow,
                test.referenceRangeHigh
              );
              return (
                <tr
                  key={test.testId}
                  className="border-b transition-colors hover:bg-muted/50"
                >
                  <td className="px-3 py-3 align-middle">
                    <span className="font-mono text-xs text-muted-foreground">
                      {test.testCode}
                    </span>
                    <p className="font-medium">{test.testName}</p>
                  </td>
                  <td className="px-3 py-3 align-middle text-sm text-muted-foreground">
                    {test.referenceRangeLow != null && test.referenceRangeHigh != null
                      ? `${test.referenceRangeLow} – ${test.referenceRangeHigh}`
                      : test.referenceRangeText ?? "—"}
                  </td>
                  <td className="px-3 py-3 align-middle text-sm text-muted-foreground">
                    {test.testUnit ?? "—"}
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <Input
                      value={row?.value ?? ""}
                      onChange={(e) => updateValue(test.testId, e.target.value)}
                      placeholder="Enter value"
                      className="w-32"
                      aria-label={`Result for ${test.testName}`}
                    />
                  </td>
                  <td className="px-3 py-3 align-middle">
                    {computed.flag && (
                      <Badge variant={computed.flag === "H" ? "destructive" : "warning"}>
                        {computed.flag}
                      </Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {tests.map((test) => {
          const row = rows.find((r) => r.testId === test.testId);
          const computed = computeFlag(
            row?.value ?? "",
            test.referenceRangeLow,
            test.referenceRangeHigh
          );
          return (
            <div key={test.testId} className="rounded-md border p-3 space-y-2">
              <div>
                <span className="font-mono text-xs text-muted-foreground">
                  {test.testCode}
                </span>
                <p className="font-medium">{test.testName}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Range:{" "}
                {test.referenceRangeLow != null && test.referenceRangeHigh != null
                  ? `${test.referenceRangeLow} – ${test.referenceRangeHigh}`
                  : test.referenceRangeText ?? "—"}
                {test.testUnit ? ` (${test.testUnit})` : ""}
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={row?.value ?? ""}
                  onChange={(e) => updateValue(test.testId, e.target.value)}
                  placeholder="Enter value"
                  aria-label={`Result for ${test.testName}`}
                />
                {computed.flag && (
                  <Badge variant={computed.flag === "H" ? "destructive" : "warning"}>
                    {computed.flag}
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Button type="submit" loading={loading}>
        Enter Results
      </Button>
    </form>
  );
}
