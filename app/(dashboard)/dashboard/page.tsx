import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";

export default async function DashboardPage() {
  const session = await requireSession();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
        <p className="text-muted-foreground">
          Hello, {session.user.name}. Here&apos;s an overview of the system.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">System Status</CardTitle>
            <CardDescription>Foundation is operational</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Phase 1 foundation is complete. Authentication, RBAC, audit logging, and error handling are active.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Role</CardTitle>
            <CardDescription>Current access level</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You are signed in as <span className="font-medium">{session.user.email}</span>.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Next Steps</CardTitle>
            <CardDescription>Upcoming phases</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Phase 2 will introduce Patient Management, Reception, Encounters, and clinical workflows.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
