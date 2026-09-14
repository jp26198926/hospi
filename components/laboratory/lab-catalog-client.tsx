"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

interface LabTest {
  id: string;
  code: string;
  name: string;
  categoryName: string | null;
  specimenType: string | null;
  unit: string | null;
  referenceRangeLow: number | null;
  referenceRangeHigh: number | null;
  referenceRangeText: string | null;
  active: boolean;
}

interface LabPanel {
  id: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  tests: Array<{ testId: string; testCode: string; testName: string }>;
}

interface SpecimenType {
  id: string;
  name: string;
  code: string;
  handlingNotes: string | null;
}

interface LabCatalogClientProps {
  initialTests: LabTest[];
  initialPanels: LabPanel[];
  initialSpecimenTypes: SpecimenType[];
}

type Tab = "tests" | "panels" | "specimen-types";

export function LabCatalogClient({
  initialTests,
  initialPanels,
  initialSpecimenTypes,
}: LabCatalogClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("tests");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Test form
  const [testCode, setTestCode] = useState("");
  const [testName, setTestName] = useState("");
  const [testUnit, setTestUnit] = useState("");
  const [testRangeLow, setTestRangeLow] = useState("");
  const [testRangeHigh, setTestRangeHigh] = useState("");
  const [testRangeText, setTestRangeText] = useState("");
  const [testSpecimenType, setTestSpecimenType] = useState("");

  // Panel form
  const [panelCode, setPanelCode] = useState("");
  const [panelName, setPanelName] = useState("");
  const [panelDescription, setPanelDescription] = useState("");
  const [panelTestIds, setPanelTestIds] = useState<string[]>([]);

  // Specimen type form
  const [stName, setStName] = useState("");
  const [stCode, setStCode] = useState("");
  const [stNotes, setStNotes] = useState("");

  function resetMessages() {
    setError(null);
    setSuccess(null);
  }

  async function createTest(e: React.FormEvent) {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const res = await fetch("/api/laboratory/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: testCode,
          name: testName,
          unit: testUnit || null,
          referenceRangeLow: testRangeLow ? Number(testRangeLow) : null,
          referenceRangeHigh: testRangeHigh ? Number(testRangeHigh) : null,
          referenceRangeText: testRangeText || null,
          specimenType: testSpecimenType || null,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message || "Failed to create test");
        return;
      }
      setSuccess("Test created.");
      setTestCode("");
      setTestName("");
      setTestUnit("");
      setTestRangeLow("");
      setTestRangeHigh("");
      setTestRangeText("");
      setTestSpecimenType("");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function createPanel(e: React.FormEvent) {
    e.preventDefault();
    resetMessages();
    if (panelTestIds.length === 0) {
      setError("Select at least one test for the panel.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/laboratory/panels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: panelCode,
          name: panelName,
          description: panelDescription || null,
          testIds: panelTestIds,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message || "Failed to create panel");
        return;
      }
      setSuccess("Panel created.");
      setPanelCode("");
      setPanelName("");
      setPanelDescription("");
      setPanelTestIds([]);
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function createSpecimenType(e: React.FormEvent) {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const res = await fetch("/api/laboratory/specimen-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: stName,
          code: stCode,
          handlingNotes: stNotes || null,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message || "Failed to create specimen type");
        return;
      }
      setSuccess("Specimen type created.");
      setStName("");
      setStCode("");
      setStNotes("");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  function togglePanelTest(testId: string) {
    setPanelTestIds((prev) =>
      prev.includes(testId) ? prev.filter((id) => id !== testId) : [...prev, testId]
    );
  }

  const tabs: Array<{ value: Tab; label: string }> = [
    { value: "tests", label: `Tests (${initialTests.length})` },
    { value: "panels", label: `Panels (${initialPanels.length})` },
    { value: "specimen-types", label: `Specimen Types (${initialSpecimenTypes.length})` },
  ];

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

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`inline-flex h-9 items-center rounded-md px-3 text-sm font-medium transition-colors ${
              tab === t.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tests Tab */}
      {tab === "tests" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create Test</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={createTest} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Code *" htmlFor="testCode">
                    <Input
                      id="testCode"
                      value={testCode}
                      onChange={(e) => setTestCode(e.target.value)}
                      required
                      maxLength={50}
                    />
                  </FormField>
                  <FormField label="Name *" htmlFor="testName">
                    <Input
                      id="testName"
                      value={testName}
                      onChange={(e) => setTestName(e.target.value)}
                      required
                      maxLength={200}
                    />
                  </FormField>
                  <FormField label="Unit" htmlFor="testUnit">
                    <Input
                      id="testUnit"
                      value={testUnit}
                      onChange={(e) => setTestUnit(e.target.value)}
                      placeholder="mg/dL, mmol/L…"
                      maxLength={50}
                    />
                  </FormField>
                  <FormField label="Specimen Type" htmlFor="testSpecimenType">
                    <Input
                      id="testSpecimenType"
                      value={testSpecimenType}
                      onChange={(e) => setTestSpecimenType(e.target.value)}
                      placeholder="blood, urine…"
                      maxLength={100}
                    />
                  </FormField>
                  <FormField label="Ref Range Low" htmlFor="testRangeLow">
                    <Input
                      id="testRangeLow"
                      type="number"
                      step="any"
                      value={testRangeLow}
                      onChange={(e) => setTestRangeLow(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Ref Range High" htmlFor="testRangeHigh">
                    <Input
                      id="testRangeHigh"
                      type="number"
                      step="any"
                      value={testRangeHigh}
                      onChange={(e) => setTestRangeHigh(e.target.value)}
                    />
                  </FormField>
                </div>
                <FormField label="Ref Range Text" htmlFor="testRangeText">
                  <Input
                    id="testRangeText"
                    value={testRangeText}
                    onChange={(e) => setTestRangeText(e.target.value)}
                    placeholder="e.g. Negative"
                    maxLength={200}
                  />
                </FormField>
                <Button type="submit" loading={loading}>
                  Create Test
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tests</CardTitle>
            </CardHeader>
            <CardContent>
              {initialTests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tests defined yet.</p>
              ) : (
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Range</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {initialTests.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-mono text-xs">{t.code}</TableCell>
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell>{t.categoryName ?? "—"}</TableCell>
                          <TableCell>{t.unit ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {t.referenceRangeLow != null && t.referenceRangeHigh != null
                              ? `${t.referenceRangeLow} – ${t.referenceRangeHigh}`
                              : t.referenceRangeText ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={t.active ? "success" : "default"}>
                              {t.active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {/* Mobile cards */}
              <div className="space-y-2 md:hidden">
                {initialTests.map((t) => (
                  <div key={t.id} className="rounded-md border p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">{t.code}</p>
                        <p className="font-medium">{t.name}</p>
                      </div>
                      <Badge variant={t.active ? "success" : "default"}>
                        {t.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.unit ? `Unit: ${t.unit} · ` : ""}
                      {t.referenceRangeLow != null && t.referenceRangeHigh != null
                        ? `Range: ${t.referenceRangeLow} – ${t.referenceRangeHigh}`
                        : t.referenceRangeText
                          ? `Range: ${t.referenceRangeText}`
                          : ""}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Panels Tab */}
      {tab === "panels" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create Panel</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={createPanel} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Code *" htmlFor="panelCode">
                    <Input
                      id="panelCode"
                      value={panelCode}
                      onChange={(e) => setPanelCode(e.target.value)}
                      required
                      maxLength={50}
                    />
                  </FormField>
                  <FormField label="Name *" htmlFor="panelName">
                    <Input
                      id="panelName"
                      value={panelName}
                      onChange={(e) => setPanelName(e.target.value)}
                      required
                      maxLength={200}
                    />
                  </FormField>
                </div>
                <FormField label="Description" htmlFor="panelDescription">
                  <Textarea
                    id="panelDescription"
                    value={panelDescription}
                    onChange={(e) => setPanelDescription(e.target.value)}
                    rows={2}
                  />
                </FormField>
                <div>
                  <p className="mb-2 text-sm font-medium">Tests *</p>
                  <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-3">
                    {initialTests.map((t) => (
                      <label
                        key={t.id}
                        className="flex cursor-pointer items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={panelTestIds.includes(t.id)}
                          onChange={() => togglePanelTest(t.id)}
                          className="h-4 w-4 rounded border-input"
                        />
                        <span className="font-mono text-xs text-muted-foreground">{t.code}</span>
                        <span>{t.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <Button type="submit" loading={loading}>
                  Create Panel
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Panels</CardTitle>
            </CardHeader>
            <CardContent>
              {initialPanels.length === 0 ? (
                <p className="text-sm text-muted-foreground">No panels defined yet.</p>
              ) : (
                <div className="space-y-3">
                  {initialPanels.map((p) => (
                    <div key={p.id} className="rounded-md border p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-mono text-xs text-muted-foreground">{p.code}</p>
                          <p className="font-medium">{p.name}</p>
                          {p.description && (
                            <p className="text-sm text-muted-foreground">{p.description}</p>
                          )}
                        </div>
                        <Badge variant={p.active ? "success" : "default"}>
                          {p.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {p.tests.length} test{p.tests.length !== 1 ? "s" : ""}:{" "}
                        {p.tests.map((t) => t.testName).join(", ")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Specimen Types Tab */}
      {tab === "specimen-types" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create Specimen Type</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={createSpecimenType} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Code *" htmlFor="stCode">
                    <Input
                      id="stCode"
                      value={stCode}
                      onChange={(e) => setStCode(e.target.value)}
                      required
                      maxLength={50}
                    />
                  </FormField>
                  <FormField label="Name *" htmlFor="stName">
                    <Input
                      id="stName"
                      value={stName}
                      onChange={(e) => setStName(e.target.value)}
                      required
                      maxLength={100}
                    />
                  </FormField>
                </div>
                <FormField label="Handling Notes" htmlFor="stNotes">
                  <Textarea
                    id="stNotes"
                    value={stNotes}
                    onChange={(e) => setStNotes(e.target.value)}
                    rows={2}
                  />
                </FormField>
                <Button type="submit" loading={loading}>
                  Create Specimen Type
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Specimen Types</CardTitle>
            </CardHeader>
            <CardContent>
              {initialSpecimenTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No specimen types defined yet.</p>
              ) : (
                <div className="space-y-2">
                  {initialSpecimenTypes.map((st) => (
                    <div
                      key={st.id}
                      className="flex items-start justify-between rounded-md border p-3"
                    >
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">{st.code}</p>
                        <p className="font-medium">{st.name}</p>
                        {st.handlingNotes && (
                          <p className="text-sm text-muted-foreground">{st.handlingNotes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
