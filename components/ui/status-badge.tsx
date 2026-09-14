import { Badge } from "./badge";

type BadgeVariant = "default" | "success" | "warning" | "destructive" | "info";

const statusVariantMap: Record<string, BadgeVariant> = {
  completed: "success",
  active: "success",
  finalized: "success",
  cancelled: "destructive",
  no_show: "destructive",
  "entered-in-error": "destructive",
  waiting: "warning",
  scheduled: "warning",
  draft: "warning",
  called: "info",
  in_progress: "info",
  confirmed: "info",
  registered: "info",
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variant = statusVariantMap[status] ?? "default";
  const label = status.replace(/_/g, " ");

  return (
    <Badge variant={variant}>
      {label}
    </Badge>
  );
}
