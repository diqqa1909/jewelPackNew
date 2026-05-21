import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

export default function BackupPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup</CardTitle>
        <CardDescription>Export/backup tools (configuration required).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-ebony-700">
        <p>This screen is ready, but backup jobs are not configured in this project yet.</p>
        <p className="text-ebony-600">
          If you tell me your preferred backup target (local folder, S3, Google Drive), I can wire the export flow.
        </p>
      </CardContent>
    </Card>
  );
}

