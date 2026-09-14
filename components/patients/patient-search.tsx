"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

interface PatientSearchResult {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: string;
  phone: string | null;
}

interface PatientSearchProps {
  onSelect: (patient: PatientSearchResult) => void;
  placeholder?: string;
}

export function PatientSearch({ onSelect, placeholder = "Search patients by name, MRN, or phone…" }: PatientSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (query.length < 2) {
      return;
    }

    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/patients?search=${encodeURIComponent(query)}&limit=10`);
        const json = await res.json();
        if (json.success) {
          setResults(json.data.items ?? []);
          setOpen(true);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query]);

  function handleSelect(patient: PatientSearchResult) {
    onSelect(patient);
    setQuery(`${patient.firstName} ${patient.lastName} (${patient.mrn})`);
    setOpen(false);
    setResults([]);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <Input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (results.length > 0) setOpen(true);
        }}
        autoComplete="off"
      />
      {loading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          Searching…
        </span>
      )}
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-card shadow-lg">
          <ul className="max-h-60 overflow-y-auto py-1">
            {results.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="flex w-full flex-col px-3 py-2 text-left hover:bg-muted"
                  onClick={() => handleSelect(p)}
                >
                  <span className="font-medium">
                    {p.firstName} {p.lastName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {p.mrn} · DOB: {new Date(p.dateOfBirth).toLocaleDateString()} · {p.sex}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {open && query.length >= 2 && results.length === 0 && !loading && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-card p-3 text-sm text-muted-foreground shadow-lg">
          No patients found
        </div>
      )}
    </div>
  );
}
