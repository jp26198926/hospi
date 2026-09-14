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

interface PatientFormData {
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  dateOfBirth: string;
  sex: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  bloodType: string;
  allergies: string;
  medicalAlerts: string;
}

const emptyForm: PatientFormData = {
  firstName: "",
  middleName: "",
  lastName: "",
  suffix: "",
  dateOfBirth: "",
  sex: "",
  phone: "",
  email: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  province: "",
  postalCode: "",
  country: "PH",
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyContactRelationship: "",
  bloodType: "",
  allergies: "",
  medicalAlerts: "",
};

function toFormData(data: Record<string, unknown>): PatientFormData {
  return {
    firstName: (data.firstName as string) ?? "",
    middleName: (data.middleName as string) ?? "",
    lastName: (data.lastName as string) ?? "",
    suffix: (data.suffix as string) ?? "",
    dateOfBirth: data.dateOfBirth
      ? new Date(data.dateOfBirth as string).toISOString().split("T")[0]
      : "",
    sex: (data.sex as string) ?? "",
    phone: (data.phone as string) ?? "",
    email: (data.email as string) ?? "",
    addressLine1: (data.addressLine1 as string) ?? "",
    addressLine2: (data.addressLine2 as string) ?? "",
    city: (data.city as string) ?? "",
    province: (data.province as string) ?? "",
    postalCode: (data.postalCode as string) ?? "",
    country: (data.country as string) ?? "PH",
    emergencyContactName: (data.emergencyContactName as string) ?? "",
    emergencyContactPhone: (data.emergencyContactPhone as string) ?? "",
    emergencyContactRelationship: (data.emergencyContactRelationship as string) ?? "",
    bloodType: (data.bloodType as string) ?? "",
    allergies: (data.allergies as string) ?? "",
    medicalAlerts: (data.medicalAlerts as string) ?? "",
  };
}

interface PatientFormProps {
  mode: "create" | "edit";
  initialData?: Record<string, unknown>;
  patientId?: string;
}

export function PatientForm({ mode, initialData, patientId }: PatientFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<PatientFormData>(
    initialData ? toFormData(initialData) : emptyForm
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof PatientFormData>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        ...form,
        middleName: form.middleName || null,
        suffix: form.suffix || null,
        phone: form.phone || null,
        email: form.email || null,
        addressLine1: form.addressLine1 || null,
        addressLine2: form.addressLine2 || null,
        city: form.city || null,
        province: form.province || null,
        postalCode: form.postalCode || null,
        country: form.country || null,
        emergencyContactName: form.emergencyContactName || null,
        emergencyContactPhone: form.emergencyContactPhone || null,
        emergencyContactRelationship: form.emergencyContactRelationship || null,
        bloodType: form.bloodType || null,
        allergies: form.allergies || null,
        medicalAlerts: form.medicalAlerts || null,
      };

      const url =
        mode === "create" ? "/api/patients" : `/api/patients/${patientId}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!json.success) {
        setError(json.error?.message || "Failed to save patient");
        return;
      }

      const id = mode === "create" ? json.data.id : patientId;
      router.push(`/patients/${id}`);
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="First Name *" htmlFor="firstName">
            <Input
              id="firstName"
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
              required
              maxLength={100}
            />
          </FormField>
          <FormField label="Middle Name" htmlFor="middleName">
            <Input
              id="middleName"
              value={form.middleName}
              onChange={(e) => set("middleName", e.target.value)}
              maxLength={100}
            />
          </FormField>
          <FormField label="Last Name *" htmlFor="lastName">
            <Input
              id="lastName"
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
              required
              maxLength={100}
            />
          </FormField>
          <FormField label="Suffix" htmlFor="suffix">
            <Input
              id="suffix"
              value={form.suffix}
              onChange={(e) => set("suffix", e.target.value)}
              placeholder="Jr., Sr., III"
              maxLength={20}
            />
          </FormField>
          <FormField label="Date of Birth *" htmlFor="dateOfBirth">
            <Input
              id="dateOfBirth"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => set("dateOfBirth", e.target.value)}
              required
            />
          </FormField>
          <FormField label="Sex *" htmlFor="sex">
            <Select
              id="sex"
              value={form.sex}
              onChange={(e) => set("sex", e.target.value)}
              required
            >
              <option value="">Select sex</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="unknown">Unknown</option>
            </Select>
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Phone" htmlFor="phone">
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              maxLength={30}
            />
          </FormField>
          <FormField label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </FormField>
          <FormField label="Address Line 1" htmlFor="addressLine1">
            <Input
              id="addressLine1"
              value={form.addressLine1}
              onChange={(e) => set("addressLine1", e.target.value)}
              maxLength={255}
            />
          </FormField>
          <FormField label="Address Line 2" htmlFor="addressLine2">
            <Input
              id="addressLine2"
              value={form.addressLine2}
              onChange={(e) => set("addressLine2", e.target.value)}
              maxLength={255}
            />
          </FormField>
          <FormField label="City" htmlFor="city">
            <Input
              id="city"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              maxLength={100}
            />
          </FormField>
          <FormField label="Province" htmlFor="province">
            <Input
              id="province"
              value={form.province}
              onChange={(e) => set("province", e.target.value)}
              maxLength={100}
            />
          </FormField>
          <FormField label="Postal Code" htmlFor="postalCode">
            <Input
              id="postalCode"
              value={form.postalCode}
              onChange={(e) => set("postalCode", e.target.value)}
              maxLength={20}
            />
          </FormField>
          <FormField label="Country" htmlFor="country">
            <Input
              id="country"
              value={form.country}
              onChange={(e) => set("country", e.target.value)}
              maxLength={50}
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Emergency Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Contact Name" htmlFor="emergencyContactName">
            <Input
              id="emergencyContactName"
              value={form.emergencyContactName}
              onChange={(e) => set("emergencyContactName", e.target.value)}
              maxLength={150}
            />
          </FormField>
          <FormField label="Contact Phone" htmlFor="emergencyContactPhone">
            <Input
              id="emergencyContactPhone"
              type="tel"
              value={form.emergencyContactPhone}
              onChange={(e) => set("emergencyContactPhone", e.target.value)}
              maxLength={30}
            />
          </FormField>
          <FormField label="Relationship" htmlFor="emergencyContactRelationship">
            <Input
              id="emergencyContactRelationship"
              value={form.emergencyContactRelationship}
              onChange={(e) => set("emergencyContactRelationship", e.target.value)}
              maxLength={50}
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clinical Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label="Blood Type" htmlFor="bloodType">
            <Select
              id="bloodType"
              value={form.bloodType}
              onChange={(e) => set("bloodType", e.target.value)}
            >
              <option value="">Unknown</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </Select>
          </FormField>
          <FormField label="Allergies" htmlFor="allergies">
            <Textarea
              id="allergies"
              value={form.allergies}
              onChange={(e) => set("allergies", e.target.value)}
              placeholder="List known allergies"
              rows={3}
            />
          </FormField>
          <FormField label="Medical Alerts" htmlFor="medicalAlerts">
            <Textarea
              id="medicalAlerts"
              value={form.medicalAlerts}
              onChange={(e) => set("medicalAlerts", e.target.value)}
              placeholder="Important medical alerts or conditions"
              rows={3}
            />
          </FormField>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" loading={loading}>
          {mode === "create" ? "Register Patient" : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
