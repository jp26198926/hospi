"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";

interface AppointmentsPageClientProps {
  initialDate: string;
  initialStatus: string;
  page: number;
  totalPages: number;
}

export function AppointmentsPageClient({
  initialDate,
  initialStatus,
  page,
  totalPages,
}: AppointmentsPageClientProps) {
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
      if ("date" in updates || "status" in updates) {
        params.delete("page");
      }
      router.push(`/appointments?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="w-full sm:w-48">
        <Input
          type="date"
          value={initialDate}
          onChange={(e) => updateParams({ date: e.target.value })}
          aria-label="Filter by date"
        />
      </div>
      <div className="w-full sm:w-48">
        <Select
          value={initialStatus}
          onChange={(e) => updateParams({ status: e.target.value })}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="confirmed">Confirmed</option>
          <option value="checked_in">Checked In</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No Show</option>
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
