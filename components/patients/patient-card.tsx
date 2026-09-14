import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

interface PatientCardProps {
  patient: {
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    sex: string;
    phone: string | null;
    status: string;
  };
}

export function PatientCard({ patient }: PatientCardProps) {
  const age = calculateAge(patient.dateOfBirth);

  return (
    <Link href={`/patients/${patient.id}`}>
      <Card className="transition-colors hover:bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {patient.firstName} {patient.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{patient.mrn}</p>
            </div>
            <StatusBadge status={patient.status} />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>
              {age} yrs · {patient.sex}
            </span>
            {patient.phone && <span>{patient.phone}</span>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
