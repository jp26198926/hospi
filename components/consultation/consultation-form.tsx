"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog } from "@/components/ui/dialog";

interface Diagnosis {
  id?: string;
  code: string;
  name: string;
  type: string;
  isPrimary: boolean;
}

interface DiagnosisCodeOption {
  id: string;
  code: string;
  name: string;
  system: string;
}

interface ConsultationFormProps {
  encounterId: string;
  patientId: string;
  providerId?: string;
  consultationId?: string;
  initialData?: {
    chiefComplaint?: string | null;
    history?: string | null;
    examination?: string | null;
    assessment?: string | null;
    treatmentPlan?: string | null;
    clinicalNotes?: string | null;
    followUpDate?: string | null;
    followUpInstructions?: string | null;
    status?: string;
  };
  initialDiagnoses?: Diagnosis[];
  isFinalized?: boolean;
}

export function ConsultationForm({
  encounterId,
  patientId,
  providerId,
  consultationId,
  initialData,
  initialDiagnoses = [],
  isFinalized = false,
}: ConsultationFormProps) {
  const router = useRouter();

  const [chiefComplaint, setChiefComplaint] = useState(initialData?.chiefComplaint ?? "");
  const [history, setHistory] = useState(initialData?.history ?? "");
  const [examination, setExamination] = useState(initialData?.examination ?? "");
  const [assessment, setAssessment] = useState(initialData?.assessment ?? "");
  const [treatmentPlan, setTreatmentPlan] = useState(initialData?.treatmentPlan ?? "");
  const [clinicalNotes, setClinicalNotes] = useState(initialData?.clinicalNotes ?? "");
  const [followUpDate, setFollowUpDate] = useState(
    initialData?.followUpDate
      ? new Date(initialData.followUpDate).toISOString().split("T")[0]
      : ""
  );
  const [followUpInstructions, setFollowUpInstructions] = useState(
    initialData?.followUpInstructions ?? ""
  );

  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>(initialDiagnoses);
  const [dxSearch, setDxSearch] = useState("");
  const [dxResults, setDxResults] = useState<DiagnosisCodeOption[]>([]);
  const [dxSearchOpen, setDxSearchOpen] = useState(false);
  const [newDxType, setNewDxType] = useState("clinical");
  const [newDxPrimary, setNewDxPrimary] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  useEffect(() => {
    if (dxSearch.length < 2) {
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/diagnosis-codes?search=${encodeURIComponent(dxSearch)}&limit=10&activeOnly=true`);
        const json = await res.json();
        if (json.success) {
          setDxResults(json.data.items ?? []);
          setDxSearchOpen(true);
        }
      } catch {
        setDxResults([]);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [dxSearch]);

  function addDiagnosis(opt: DiagnosisCodeOption) {
    if (diagnoses.some((d) => d.code === opt.code)) return;
    setDiagnoses((prev) => [
      ...prev,
      {
        code: opt.code,
        name: opt.name,
        type: newDxType,
        isPrimary: newDxPrimary && prev.length === 0,
      },
    ]);
    setDxSearch("");
    setDxResults([]);
    setDxSearchOpen(false);
  }

  function removeDiagnosis(index: number) {
    setDiagnoses((prev) => prev.filter((_, i) => i !== index));
  }

  function buildPayload() {
    return {
      chiefComplaint: chiefComplaint.trim() || null,
      history: history.trim() || null,
      examination: examination.trim() || null,
      assessment: assessment.trim() || null,
      treatmentPlan: treatmentPlan.trim() || null,
      clinicalNotes: clinicalNotes.trim() || null,
      followUpDate: followUpDate || null,
      followUpInstructions: followUpInstructions.trim() || null,
      patientId,
      providerId: providerId ?? "",
    };
  }

  async function saveDraft() {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const payload = buildPayload();
      // Remove providerId and patientId for PATCH (not in update schema)
      const rest = {
        chiefComplaint: payload.chiefComplaint,
        history: payload.history,
        examination: payload.examination,
        assessment: payload.assessment,
        treatmentPlan: payload.treatmentPlan,
        clinicalNotes: payload.clinicalNotes,
        followUpDate: payload.followUpDate,
        followUpInstructions: payload.followUpInstructions,
      };

      let consultationIdResult = consultationId;

      if (consultationId) {
        const res = await fetch(`/api/consultations/${consultationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rest),
        });
        const json = await res.json();
        if (!json.success) {
          setError(json.error?.message || "Failed to save draft");
          return;
        }
      } else {
        const res = await fetch(`/api/encounters/${encounterId}/consultations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...rest,
            patientId,
            providerId: providerId ?? "",
          }),
        });
        const json = await res.json();
        if (!json.success) {
          setError(json.error?.message || "Failed to create consultation");
          return;
        }
        consultationIdResult = json.data.id;
      }

      // Save diagnoses if we have a consultation ID
      if (consultationIdResult && diagnoses.length > 0) {
        // Only save new diagnoses (no id)
        for (const dx of diagnoses.filter((d) => !d.id)) {
          await fetch(`/api/encounters/${encounterId}/diagnoses`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              consultationId: consultationIdResult,
              encounterId,
              code: dx.code,
              name: dx.name,
              type: dx.type,
              isPrimary: dx.isPrimary,
            }),
          });
        }
      }

      setSuccess("Draft saved successfully");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleFinalize() {
    if (!consultationId) {
      setError("Please save the consultation before finalizing");
      setFinalizeOpen(false);
      return;
    }

    setFinalizing(true);
    setError(null);
    try {
      // Save draft first
      const payload = buildPayload();
      const updatePayload = {
        chiefComplaint: payload.chiefComplaint,
        history: payload.history,
        examination: payload.examination,
        assessment: payload.assessment,
        treatmentPlan: payload.treatmentPlan,
        clinicalNotes: payload.clinicalNotes,
        followUpDate: payload.followUpDate,
        followUpInstructions: payload.followUpInstructions,
      };

      const saveRes = await fetch(`/api/consultations/${consultationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });
      const saveJson = await saveRes.json();
      if (!saveJson.success) {
        setError(saveJson.error?.message || "Failed to save before finalizing");
        setFinalizeOpen(false);
        return;
      }

      const res = await fetch(`/api/consultations/${consultationId}/finalize`, {
        method: "POST",
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error?.message || "Failed to finalize consultation");
        setFinalizeOpen(false);
        return;
      }

      setFinalizeOpen(false);
      setSuccess("Consultation finalized");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
      setFinalizeOpen(false);
    } finally {
      setFinalizing(false);
    }
  }

  if (isFinalized) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <StatusBadge status="finalized" />
          <span className="text-sm text-muted-foreground">
            This consultation has been finalized and cannot be edited.
          </span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Consultation Record</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Chief Complaint</h4>
              <p className="mt-1 text-sm">{initialData?.chiefComplaint || "—"}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">History</h4>
              <p className="mt-1 whitespace-pre-wrap text-sm">{initialData?.history || "—"}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Examination</h4>
              <p className="mt-1 whitespace-pre-wrap text-sm">{initialData?.examination || "—"}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Assessment</h4>
              <p className="mt-1 whitespace-pre-wrap text-sm">{initialData?.assessment || "—"}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Treatment Plan</h4>
              <p className="mt-1 whitespace-pre-wrap text-sm">{initialData?.treatmentPlan || "—"}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Clinical Notes</h4>
              <p className="mt-1 whitespace-pre-wrap text-sm">{initialData?.clinicalNotes || "—"}</p>
            </div>
            {initialData?.followUpDate && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Follow-up</h4>
                <p className="mt-1 text-sm">
                  {new Date(initialData.followUpDate).toLocaleDateString()}
                  {initialData.followUpInstructions && ` — ${initialData.followUpInstructions}`}
                </p>
              </div>
            )}
            {diagnoses.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Diagnoses</h4>
                <ul className="mt-1 space-y-1">
                  {diagnoses.map((dx, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span className="font-mono">{dx.code}</span>
                      <span>{dx.name}</span>
                      {dx.isPrimary && <Badge variant="info">Primary</Badge>}
                      <Badge variant="default">{dx.type}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consultation Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label="Chief Complaint" htmlFor="chiefComplaint">
            <Textarea
              id="chiefComplaint"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              rows={2}
              placeholder="Presenting complaint"
            />
          </FormField>
          <FormField label="History" htmlFor="history">
            <Textarea
              id="history"
              value={history}
              onChange={(e) => setHistory(e.target.value)}
              rows={4}
              placeholder="History of present illness, past medical history, etc."
            />
          </FormField>
          <FormField label="Examination" htmlFor="examination">
            <Textarea
              id="examination"
              value={examination}
              onChange={(e) => setExamination(e.target.value)}
              rows={4}
              placeholder="Physical examination findings"
            />
          </FormField>
          <FormField label="Assessment" htmlFor="assessment">
            <Textarea
              id="assessment"
              value={assessment}
              onChange={(e) => setAssessment(e.target.value)}
              rows={3}
              placeholder="Clinical assessment"
            />
          </FormField>
          <FormField label="Treatment Plan" htmlFor="treatmentPlan">
            <Textarea
              id="treatmentPlan"
              value={treatmentPlan}
              onChange={(e) => setTreatmentPlan(e.target.value)}
              rows={3}
              placeholder="Plan of care"
            />
          </FormField>
          <FormField label="Clinical Notes" htmlFor="clinicalNotes">
            <Textarea
              id="clinicalNotes"
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              rows={3}
              placeholder="Additional clinical notes"
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Follow-up Date" htmlFor="followUpDate">
              <Input
                id="followUpDate"
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
              />
            </FormField>
          </div>
          <FormField label="Follow-up Instructions" htmlFor="followUpInstructions">
            <Textarea
              id="followUpInstructions"
              value={followUpInstructions}
              onChange={(e) => setFollowUpInstructions(e.target.value)}
              rows={2}
              placeholder="Instructions for follow-up"
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Diagnoses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField label="Type" htmlFor="dxType">
              <Select
                id="dxType"
                value={newDxType}
                onChange={(e) => setNewDxType(e.target.value)}
              >
                <option value="clinical">Clinical</option>
                <option value="provisional">Provisional</option>
                <option value="admitting">Admitting</option>
                <option value="discharge">Discharge</option>
                <option value="final">Final</option>
              </Select>
            </FormField>
            <FormField label="Search Code" htmlFor="dxSearch">
              <Input
                id="dxSearch"
                value={dxSearch}
                onChange={(e) => setDxSearch(e.target.value)}
                placeholder="Search ICD code or name…"
                autoComplete="off"
              />
            </FormField>
            <div className="flex items-end">
              <label className="flex h-10 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newDxPrimary}
                  onChange={(e) => setNewDxPrimary(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                Primary diagnosis
              </label>
            </div>
          </div>

          {dxSearchOpen && dxResults.length > 0 && (
            <div className="rounded-md border">
              <ul className="max-h-48 overflow-y-auto">
                {dxResults.map((opt) => (
                  <li key={opt.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted"
                      onClick={() => addDiagnosis(opt)}
                    >
                      <span className="font-mono text-sm font-medium">{opt.code}</span>
                      <span className="text-sm">{opt.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{opt.system}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {diagnoses.length > 0 && (
            <div className="space-y-2">
              {diagnoses.map((dx, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">{dx.code}</span>
                    <span className="text-sm">{dx.name}</span>
                    {dx.isPrimary && <Badge variant="info">Primary</Badge>}
                    <Badge variant="default">{dx.type}</Badge>
                  </div>
                  {!dx.id && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDiagnosis(i)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={saveDraft} loading={loading} variant="secondary">
          Save Draft
        </Button>
        <Button
          type="button"
          onClick={() => setFinalizeOpen(true)}
          disabled={!consultationId && !loading}
        >
          Finalize
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={loading}>
          Back
        </Button>
      </div>

      <Dialog open={finalizeOpen} onClose={() => setFinalizeOpen(false)} title="Finalize Consultation">
        <p className="text-sm text-muted-foreground">
          Once finalized, this consultation cannot be edited. A finalization record and audit trail
          will be created. Are you sure you want to proceed?
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setFinalizeOpen(false)} disabled={finalizing}>
            Cancel
          </Button>
          <Button onClick={handleFinalize} loading={finalizing}>
            Confirm Finalize
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
