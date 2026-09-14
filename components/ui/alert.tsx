import type { HTMLAttributes } from "react";

type Variant = "info" | "success" | "warning" | "error";

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  info: "border-info/30 bg-info/10 text-info",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function Alert({ className = "", variant = "info", ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={`relative rounded-lg border p-4 ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}

export function AlertTitle({ className = "", ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5 className={`mb-1 font-medium leading-none tracking-tight ${className}`} {...props} />
  );
}

export function AlertDescription({
  className = "",
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-sm opacity-90 ${className}`} {...props} />;
}
