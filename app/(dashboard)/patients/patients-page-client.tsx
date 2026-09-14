"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";

interface PatientsPageClientProps {
  initialSearch: string;
  initialStatus: string;
  page: number;
  totalPages: number;
}

export function PatientsPageClient({
  initialSearch,
  initialStatus,
  page,
  totalPages,
}: PatientsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      // Reset page when search or status changes
      if ("search" in updates || "status" in updates) {
        params.delete("page");
      }
      router.push(`/patients?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex-1">
        <SearchInput
          placeholder="Search by name, MRN, or phone…"
          value={initialSearch}
          onChange={(value) => updateParams({ search: value })}
        />
      </div>
      <div className="w-full sm:w-48">
        <Select
          value={initialStatus}
          onChange={(e) => updateParams({ status: e.target.value })}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="deceased">Deceased</option>
          <option value="merged">Merged</option>
        </Select>
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center sm:justify-end">
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={(p) => updateParams({ page: String(p) })}
          />
        </div>
      )}
    </div>
  );
}
