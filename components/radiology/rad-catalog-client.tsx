"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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

interface Modality {
  id: string;
  code: string;
  name: string;
}

interface Procedure {
  id: string;
  code: string;
  name: string;
  modalityName: string | null;
  modalityCode: string | null;
  bodyPart: string | null;
  durationMinutes: number | null;
  active: boolean;
}

interface RadCatalogClientProps {
  initialModalities: Modality[];
  initialProcedures: Procedure[];
}

export function RadCatalogClient({
  initialModalities,
  initialProcedures,
}: RadCatalogClientProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Modality form
  const [modCode, setModCode] = useState("");
  const [modName, setModName] = useState("");

  // Procedure form
  const [procCode, setProcCode] = useState("");
  const [procName, setProcName] = useState("");
  const [procModalityId, setProcModalityId] = useState("");
  const [procBodyPart, setProcBodyPart] = useState("");
  const [procDuration, setProcDuration] = useState("30");
  const [procPrep, setProcPrep] = useState("");

  function resetMessages() {
    setError(null);
    setSuccess(null);
  }

  async function createModality(e: React.FormEvent) {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const res = await fetch("/api/radiology/modalities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: modCode, name: modName }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message || "Failed to create modality");
        return;
      }
      setSuccess("Modality created.");
      setModCode("");
      setModName("");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function createProcedure(e: React.FormEvent) {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const res = await fetch("/api/radiology/procedures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: procCode,
          name: procName,
          modalityId: procModalityId,
          bodyPart: procBodyPart || null,
          durationMinutes: Number(procDuration) || 30,
          prepInstructions: procPrep || null,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message || "Failed to create procedure");
        return;
      }
      setSuccess("Procedure created.");
      setProcCode("");
      setProcName("");
      setProcModalityId("");
      setProcBodyPart("");
      setProcDuration("30");
      setProcPrep("");
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

      {/* Modalities */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Modalities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={createModality} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Code *" htmlFor="modCode">
                <Input
                  id="modCode"
                  value={modCode}
                  onChange={(e) => setModCode(e.target.value)}
                  required
                  maxLength={20}
                  placeholder="CT, MRI, XR…"
                />
              </FormField>
              <FormField label="Name *" htmlFor="modName">
                <Input
                  id="modName"
                  value={modName}
                  onChange={(e) => setModName(e.target.value)}
                  required
                  maxLength={100}
                  placeholder="Computed Tomography"
                />
              </FormField>
            </div>
            <Button type="submit" size="sm" loading={loading}>
              Add Modality
            </Button>
          </form>

          {initialModalities.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t pt-3">
              {initialModalities.map((m) => (
                <Badge key={m.id} variant="info">
                  {m.code} — {m.name}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Procedures */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create Procedure</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createProcedure} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Code *" htmlFor="procCode">
                <Input
                  id="procCode"
                  value={procCode}
                  onChange={(e) => setProcCode(e.target.value)}
                  required
                  maxLength={50}
                />
              </FormField>
              <FormField label="Name *" htmlFor="procName">
                <Input
                  id="procName"
                  value={procName}
                  onChange={(e) => setProcName(e.target.value)}
                  required
                  maxLength={200}
                />
              </FormField>
              <FormField label="Modality *" htmlFor="procModalityId">
                <Select
                  id="procModalityId"
                  value={procModalityId}
                  onChange={(e) => setProcModalityId(e.target.value)}
                  required
                >
                  <option value="">Select modality</option>
                  {initialModalities.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} — {m.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Body Part" htmlFor="procBodyPart">
                <Input
                  id="procBodyPart"
                  value={procBodyPart}
                  onChange={(e) => setProcBodyPart(e.target.value)}
                  maxLength={100}
                />
              </FormField>
              <FormField label="Duration (minutes)" htmlFor="procDuration">
                <Input
                  id="procDuration"
                  type="number"
                  min={1}
                  value={procDuration}
                  onChange={(e) => setProcDuration(e.target.value)}
                />
              </FormField>
            </div>
            <FormField label="Prep Instructions" htmlFor="procPrep">
              <Textarea
                id="procPrep"
                value={procPrep}
                onChange={(e) => setProcPrep(e.target.value)}
                rows={2}
              />
            </FormField>
            <Button type="submit" loading={loading}>
              Create Procedure
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Procedures List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Procedures ({initialProcedures.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {initialProcedures.length === 0 ? (
            <p className="text-sm text-muted-foreground">No procedures defined yet.</p>
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Modality</TableHead>
                      <TableHead>Body Part</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {initialProcedures.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.code}</TableCell>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{p.modalityName ?? "—"}</TableCell>
                        <TableCell>{p.bodyPart ?? "—"}</TableCell>
                        <TableCell>{p.durationMinutes ?? 30} min</TableCell>
                        <TableCell>
                          <Badge variant={p.active ? "success" : "default"}>
                            {p.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="space-y-2 md:hidden">
                {initialProcedures.map((p) => (
                  <div key={p.id} className="rounded-md border p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">{p.code}</p>
                        <p className="font-medium">{p.name}</p>
                      </div>
                      <Badge variant={p.active ? "success" : "default"}>
                        {p.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.modalityName ? `${p.modalityName} · ` : ""}
                      {p.bodyPart ? `${p.bodyPart} · ` : ""}
                      {p.durationMinutes ?? 30} min
                    </p>
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
