import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { SystemSettingsForm } from "@/components/app/SystemSettingsForm";

export default function SettingsPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Gold Rate</CardTitle>
          <CardDescription>Update system rates used for costing and invoicing.</CardDescription>
        </CardHeader>
        <CardContent>
          <SystemSettingsForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
          <CardDescription>Optional configuration placeholders.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-ebony-700">
          <p>Business profile / invoice header / user roles are not wired in this codebase yet.</p>
          <p className="text-ebony-600">
            If you want this to match the screenshot fully (profile, users/roles, backup), tell me the exact fields and
            workflow and I’ll build them.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
