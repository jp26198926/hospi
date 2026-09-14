"use client";

import { useState } from "react";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ReportFormProps {
  studyId: string;
  reportId?: string;
  initialData?: {
    findings: string;
    impressions: string;
    recommendations: string | null;
  };
  isFinalized?: boolean;
  onSaved?: () => void;
}

export function ReportForm({
  studyId,
  reportId,
  initialData,
  isFinalized,
  onSaved,
}: ReportFormProps) {
  const [findings, setFindings] = useState(initialData?.findings ?? "");
  const [impressions, setImpressions] = useState(initialData?.impressions ?? "");
  const [recommendations, setRecommendations] = useState(
    initialData?.recommendations ?? ""
  );
  const [loading, setLoading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function saveDraft() {
    setError(null);
    setSuccess(null);

    if (!findings.trim() || !impressions.trim()) {
      setError("Findings and impressions are required.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        studyId,
        findings,
        impressions,
        recommendations: recommendations || null,
      };

      let res;
      if (reportId) {
        res = await fetch(`/api/radiology/reports/${reportId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            findings,
            impressions,
            recommendations: recommendations || null,
          }),
        });
      } else {
        res = await fetch("/api/radiology/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message || "Failed to save report");
        return;
      }

      setSuccess("Draft saved.");
      onSaved?.();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function finalize() {
    setError(null);
    setSuccess(null);

    if (!reportId) {
      setError("Save the draft before finalizing.");
      return;
    }
    if (!findings.trim() || !impressions.trim()) {
      setError("Findings and impressions are required before finalizing.");
      return;
    }

    setFinalizing(true);
    try {
      // Save latest content first
      const saveRes = await fetch(`/api/radiology/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          findings,
          impressions,
          recommendations: recommendations || null,
        }),
      });
      const saveJson = await saveRes.json();
      if (!saveJson.success) {
        setError(saveJson.error?.message || "Failed to save before finalizing");
        return;
      }

      const res = await fetch(`/api/radiology/reports/${reportId}/finalize`, {
        method: "POST",
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message || "Failed to finalize report");
        return;
      }

      setSuccess("Report finalized.");
      onSaved?.();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setFinalizing(false);
    }
  }

  if (isFinalized) {
    return (
      <div className="space-y-4">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium">Findings</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
              {initialData?.findings || "—"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Impressions</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
              {initialData?.impressions || "—"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Recommendations</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
              {initialData?.recommendations || "—"}
            </p>
          </div>
        </div>
        <Alert variant="success">
          <AlertDescription>This report has been finalized and cannot be edited.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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

      <FormField label="Findings *" htmlFor="findings">
        <Textarea
          id="findings"
          value={findings}
          onChange={(e) => setFindings(e.target.value)}
          placeholder="Describe the imaging findings…"
          rows={6}
          required
        />
      </FormField>

      <FormField label="Impressions *" htmlFor="impressions">
        <Textarea
          id="impressions"
          value={impressions}
          onChange={(e) => setImpressions(e.target.value)}
          placeholder="Diagnostic impression…"
          rows={4}
          required
        />
      </FormField>

      <FormField label="Recommendations" htmlFor="recommendations">
        <Textarea
          id="recommendations"
          value={recommendations}
          onChange={(e) => setRecommendations(e.target.value)}
          placeholder="Follow-up recommendations…"
          rows={3}
        />
      </FormField>

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" onClick={saveDraft} loading={loading}>
          Save Draft
        </Button>
        {reportId && (
          <Button type="button" onClick={finalize} loading={finalizing}>
            Finalize
          </Button>
        )}
      </div>
      {!reportId && (
        <p className="text-xs text-muted-foreground">
          Save the draft first, then you can finalize the report.
        </p>
      )}
    </div>
  );
}
