import type { ReactNode } from "react";
import { Label } from "./label";
import { Input } from "./input";

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  children?: ReactNode;
}

export function FormField({ label, htmlFor, error, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children ?? <Input id={htmlFor} name={htmlFor} error={!!error} />}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
