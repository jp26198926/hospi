"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ReportForm } from "./report-form";

interface RadOrderDetail {
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
  radOrderId: string;
  procedureId: string;
  clinicalQuestion: string | null;
  procedureName: string | null;
  procedureCode: string | null;
  modalityName: string | null;
  study: {
    id: string;
    orderId: string;
    modalityId: string | null;
    scheduledAt: string | null;
    technicianId: string | null;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
    equipment: string | null;
    notes: string | null;
  } | null;
  reports: Array<{
    id: string;
    studyId: string;
    findings: string;
    impressions: string;
    recommendations: string | null;
    status: string;
    reportedAt: string | null;
    finalizedAt: string | null;
    createdAt: string;
  }>;
}

const priorityVariant: Record<string, "default" | "warning" | "destructive"> = {
  normal: "default",
  urgent: "warning",
  emergency: "destructive",
};

interface RadOrderWorkspaceProps {
  orderId: string;
}

export function RadOrderWorkspace({ orderId }: RadOrderWorkspaceProps) {
  const router = useRouter();
  const [order, setOrder] = useState<RadOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Schedule form
  const [scheduledAt, setScheduledAt] = useState("");
  const [equipment, setEquipment] = useState("");
  const [studyNotes, setStudyNotes] = useState("");
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showCompleteForm, setShowCompleteForm] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/radiology/orders/${orderId}`);
      const json = await res.json();
      if (json.success) {
        setOrder(json.data);
        setError(null);
      } else {
        setError(json.error?.message || "Failed to load radiology order");
      }
    } catch {
      setError("Failed to load radiology order");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/radiology/orders/${orderId}`);
        const json = await res.json();
        if (!cancelled) {
          if (json.success) {
            setOrder(json.data);
            setError(null);
          } else {
            setError(json.error?.message || "Failed to load radiology order");
          }
        }
      } catch {
        if (!cancelled) setError("Failed to load radiology order");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  async function scheduleStudy() {
    if (!order?.study) return;
    setActionError(null);
    setActionLoading("schedule");
    try {
      const res = await fetch(`/api/radiology/studies/${order.study.id}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt,
          equipment: equipment || null,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setActionError(json.error?.message || "Failed to schedule study");
        return;
      }
      setShowScheduleForm(false);
      setScheduledAt("");
      setEquipment("");
      await fetchOrder();
    } catch {
      setActionError("Failed to schedule study");
    } finally {
      setActionLoading(null);
    }
  }

  async function startStudy() {
    if (!order?.study) return;
    setActionError(null);
    setActionLoading("start");
    try {
      const res = await fetch(`/api/radiology/studies/${order.study.id}/start`, {
        method: "POST",
      });
      const json = await res.json();
      if (!json.success) {
        setActionError(json.error?.message || "Failed to start study");
        return;
      }
      await fetchOrder();
      router.refresh();
    } catch {
      setActionError("Failed to start study");
    } finally {
      setActionLoading(null);
    }
  }

  async function completeStudy() {
    if (!order?.study) return;
    setActionError(null);
    setActionLoading("complete");
    try {
      const res = await fetch(`/api/radiology/studies/${order.study.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: studyNotes || null }),
      });
      const json = await res.json();
      if (!json.success) {
        setActionError(json.error?.message || "Failed to complete study");
        return;
      }
      setShowCompleteForm(false);
      setStudyNotes("");
      await fetchOrder();
    } catch {
      setActionError("Failed to complete study");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Loading radiology order…</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <Alert variant="error">
        <AlertDescription>{error ?? "Radiology order not found"}</AlertDescription>
      </Alert>
    );
  }

  const patientName = `${order.patientFirstName ?? ""} ${order.patientLastName ?? ""}`.trim();
  const study = order.study;
  const latestReport = order.reports.find((r) => r.status === "draft") ?? order.reports[0];
  const isReportFinalized = latestReport?.status === "finalized";
  const studyCompleted = study?.status === "completed";

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
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Procedure: </span>
              <span className="font-medium">
                {order.procedureName ?? "—"}
                {order.procedureCode && (
                  <span className="ml-1 font-mono text-xs text-muted-foreground">
                    {order.procedureCode}
                  </span>
                )}
              </span>
            </div>
            {order.modalityName && (
              <div>
                <span className="text-muted-foreground">Modality: </span>
                <span>{order.modalityName}</span>
              </div>
            )}
          </div>
          {order.clinicalQuestion && (
            <p className="text-sm">
              <span className="text-muted-foreground">Clinical Question: </span>
              {order.clinicalQuestion}
            </p>
          )}
          {order.clinicalNotes && (
            <p className="text-sm">
              <span className="text-muted-foreground">Notes: </span>
              {order.clinicalNotes}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Ordered {new Date(order.createdAt).toLocaleString()}
          </p>
        </CardContent>
      </Card>

      {/* Study Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Study</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!study ? (
            <p className="text-sm text-muted-foreground">
              No study created yet. Acknowledge the order to create a study.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={study.status} />
                {study.scheduledAt && (
                  <span className="text-sm text-muted-foreground">
                    Scheduled: {new Date(study.scheduledAt).toLocaleString()}
                  </span>
                )}
                {study.equipment && (
                  <span className="text-sm text-muted-foreground">
                    Equipment: {study.equipment}
                  </span>
                )}
              </div>

              {study.startedAt && (
                <p className="text-xs text-muted-foreground">
                  Started {new Date(study.startedAt).toLocaleString()}
                </p>
              )}
              {study.completedAt && (
                <p className="text-xs text-muted-foreground">
                  Completed {new Date(study.completedAt).toLocaleString()}
                </p>
              )}
              {study.notes && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Study Notes: </span>
                  {study.notes}
                </p>
              )}

              {/* Schedule form */}
              {study.status !== "completed" && (
                <div className="space-y-3">
                  {!showScheduleForm ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setShowScheduleForm(true)}
                    >
                      {study.scheduledAt ? "Reschedule" : "Schedule"}
                    </Button>
                  ) : (
                    <div className="space-y-3 rounded-md border p-3">
                      <FormField label="Scheduled At *" htmlFor="scheduledAt">
                        <Input
                          id="scheduledAt"
                          type="datetime-local"
                          value={scheduledAt}
                          onChange={(e) => setScheduledAt(e.target.value)}
                          required
                        />
                      </FormField>
                      <FormField label="Equipment" htmlFor="equipment">
                        <Input
                          id="equipment"
                          value={equipment}
                          onChange={(e) => setEquipment(e.target.value)}
                          placeholder="e.g. CT Scanner 1"
                        />
                      </FormField>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={scheduleStudy}
                          loading={actionLoading === "schedule"}
                          disabled={!scheduledAt}
                        >
                          Save Schedule
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowScheduleForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Start / Complete */}
                  <div className="flex flex-wrap gap-2">
                    {study.status === "scheduled" && (
                      <Button
                        size="sm"
                        onClick={startStudy}
                        loading={actionLoading === "start"}
                      >
                        Start Study
                      </Button>
                    )}
                    {study.status === "in_progress" && (
                      <>
                        {!showCompleteForm ? (
                          <Button
                            size="sm"
                            onClick={() => setShowCompleteForm(true)}
                          >
                            Complete Study
                          </Button>
                        ) : (
                          <div className="w-full space-y-3 rounded-md border p-3">
                            <FormField label="Notes" htmlFor="studyNotes">
                              <Textarea
                                id="studyNotes"
                                value={studyNotes}
                                onChange={(e) => setStudyNotes(e.target.value)}
                                rows={2}
                              />
                            </FormField>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={completeStudy}
                                loading={actionLoading === "complete"}
                              >
                                Confirm Complete
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowCompleteForm(false)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Report Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report</CardTitle>
        </CardHeader>
        <CardContent>
          {!studyCompleted ? (
            <p className="text-sm text-muted-foreground">
              Complete the study before creating a report.
            </p>
          ) : (
            <ReportForm
              studyId={study!.id}
              reportId={latestReport?.id}
              initialData={
                latestReport
                  ? {
                      findings: latestReport.findings,
                      impressions: latestReport.impressions,
                      recommendations: latestReport.recommendations,
                    }
                  : undefined
              }
              isFinalized={isReportFinalized}
              onSaved={fetchOrder}
            />
          )}

          {order.reports.length > 1 && (
            <div className="mt-6 border-t pt-4">
              <p className="mb-2 text-sm font-medium">Report History</p>
              <div className="space-y-2">
                {order.reports.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-md border p-2 text-sm"
                  >
                    <span className="text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString()}
                    </span>
                    <StatusBadge status={r.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
