"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

interface Document {
  id: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  secureUrl: string;
  createdAt: string;
}

interface DocumentUploadProps {
  ownerEntity: string;
  ownerId: string;
  onUploaded?: (doc: Document) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentUpload({ ownerEntity, ownerId, onUploaded }: DocumentUploadProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function refetchDocuments() {
    try {
      const res = await fetch(
        `/api/documents?ownerEntity=${encodeURIComponent(ownerEntity)}&ownerId=${encodeURIComponent(ownerId)}`
      );
      const json = await res.json();
      if (json.success) {
        setDocuments(json.data.items ?? []);
      }
    } catch {
      // keep existing
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `/api/documents?ownerEntity=${encodeURIComponent(ownerEntity)}&ownerId=${encodeURIComponent(ownerId)}`
        );
        const json = await res.json();
        if (!cancelled && json.success) {
          setDocuments(json.data.items ?? []);
        }
      } catch {
        // keep existing
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [ownerEntity, ownerId]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("ownerEntity", ownerEntity);
      formData.append("ownerId", ownerId);

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error?.message || "Upload failed");
        return;
      }

      setSuccess(`Uploaded ${file.name}`);
      onUploaded?.(json.data);
      await refetchDocuments();
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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

        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            disabled={uploading}
            className="flex-1 text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
            aria-label="Upload document"
          />
          {uploading && (
            <span className="text-sm text-muted-foreground">Uploading…</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Accepted: JPEG, PNG, WebP, PDF. Max 10 MB.
        </p>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading documents…</p>
        ) : documents.length === 0 ? (
          <EmptyState
            title="No documents"
            description="Upload images or PDFs related to this record."
          />
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{doc.originalFilename}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(doc.size)} ·{" "}
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="ml-3 flex items-center gap-2">
                  <Badge variant={doc.mimeType.startsWith("image/") ? "info" : "default"}>
                    {doc.mimeType.includes("pdf") ? "PDF" : "Image"}
                  </Badge>
                  <a
                    href={doc.secureUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    View
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
