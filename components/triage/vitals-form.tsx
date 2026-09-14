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

interface VitalsFormProps {
  encounterId: string;
  patientName: string;
}

export function VitalsForm({ encounterId, patientName }: VitalsFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const [temperature, setTemperature] = useState("");
  const [bpSystolic, setBpSystolic] = useState("");
  const [bpDiastolic, setBpDiastolic] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");
  const [oxygenSaturation, setOxygenSaturation] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [painScore, setPainScore] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [allergies, setAllergies] = useState("");
  const [triageCategory, setTriageCategory] = useState("");
  const [notes, setNotes] = useState("");

  function numVal(v: string): number | null {
    if (v === "") return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!chiefComplaint.trim()) {
      setError("Chief complaint is required");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        temperature: numVal(temperature),
        bpSystolic: numVal(bpSystolic),
        bpDiastolic: numVal(bpDiastolic),
        heartRate: numVal(heartRate),
        respiratoryRate: numVal(respiratoryRate),
        oxygenSaturation: numVal(oxygenSaturation),
        weight: numVal(weight),
        height: numVal(height),
        painScore: painScore === "" ? null : parseInt(painScore, 10),
        chiefComplaint: chiefComplaint.trim(),
        allergies: allergies.trim() || null,
        triageCategory: triageCategory || null,
        notes: notes.trim() || null,
      };

      const res = await fetch(`/api/encounters/${encounterId}/triage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error?.message || "Failed to record vitals");
        return;
      }

      setSuccess(true);
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert variant="success">
          <AlertDescription>Vitals recorded successfully.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vital Signs — {patientName}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField label="Temperature (°C)" htmlFor="temperature">
            <Input
              id="temperature"
              type="number"
              step="0.1"
              min="20"
              max="50"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              placeholder="36.5"
            />
          </FormField>
          <FormField label="BP Systolic (mmHg)" htmlFor="bpSystolic">
            <Input
              id="bpSystolic"
              type="number"
              min="30"
              max="300"
              value={bpSystolic}
              onChange={(e) => setBpSystolic(e.target.value)}
              placeholder="120"
            />
          </FormField>
          <FormField label="BP Diastolic (mmHg)" htmlFor="bpDiastolic">
            <Input
              id="bpDiastolic"
              type="number"
              min="10"
              max="200"
              value={bpDiastolic}
              onChange={(e) => setBpDiastolic(e.target.value)}
              placeholder="80"
            />
          </FormField>
          <FormField label="Heart Rate (bpm)" htmlFor="heartRate">
            <Input
              id="heartRate"
              type="number"
              min="10"
              max="300"
              value={heartRate}
              onChange={(e) => setHeartRate(e.target.value)}
              placeholder="72"
            />
          </FormField>
          <FormField label="Respiratory Rate (/min)" htmlFor="respiratoryRate">
            <Input
              id="respiratoryRate"
              type="number"
              min="4"
              max="80"
              value={respiratoryRate}
              onChange={(e) => setRespiratoryRate(e.target.value)}
              placeholder="16"
            />
          </FormField>
          <FormField label="Oxygen Saturation (%)" htmlFor="oxygenSaturation">
            <Input
              id="oxygenSaturation"
              type="number"
              min="0"
              max="100"
              value={oxygenSaturation}
              onChange={(e) => setOxygenSaturation(e.target.value)}
              placeholder="98"
            />
          </FormField>
          <FormField label="Weight (kg)" htmlFor="weight">
            <Input
              id="weight"
              type="number"
              step="0.1"
              min="0"
              max="500"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="70"
            />
          </FormField>
          <FormField label="Height (cm)" htmlFor="height">
            <Input
              id="height"
              type="number"
              step="0.1"
              min="0"
              max="300"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="170"
            />
          </FormField>
          <FormField label="Pain Score (0–10)" htmlFor="painScore">
            <Select
              id="painScore"
              value={painScore}
              onChange={(e) => setPainScore(e.target.value)}
            >
              <option value="">Select</option>
              {Array.from({ length: 11 }, (_, i) => (
                <option key={i} value={String(i)}>
                  {i}
                </option>
              ))}
            </Select>
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Triage Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label="Chief Complaint *" htmlFor="chiefComplaint">
            <Textarea
              id="chiefComplaint"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="Describe the chief complaint"
              rows={3}
              required
            />
          </FormField>
          <FormField label="Known Allergies" htmlFor="allergies">
            <Textarea
              id="allergies"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="Any allergies reported"
              rows={2}
            />
          </FormField>
          <FormField label="Triage Category" htmlFor="triageCategory">
            <Select
              id="triageCategory"
              value={triageCategory}
              onChange={(e) => setTriageCategory(e.target.value)}
            >
              <option value="">Select category</option>
              <option value="emergency">Emergency</option>
              <option value="urgent">Urgent</option>
              <option value="semi-urgent">Semi-urgent</option>
              <option value="non-urgent">Non-urgent</option>
              <option value="stable">Stable</option>
            </Select>
          </FormField>
          <FormField label="Notes" htmlFor="notes">
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes"
              rows={3}
            />
          </FormField>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" loading={loading}>
          Record Vitals
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()} disabled={loading}>
          Back to Queue
        </Button>
      </div>
    </form>
  );
}
